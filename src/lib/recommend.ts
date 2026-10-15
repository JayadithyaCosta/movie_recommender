import type { Movie, Prisma, SessionType } from "@prisma/client";

import { STEP_TREE } from "@/config/steps";
import { findCachedPicks, pathHashOf } from "@/lib/cache";
import { db } from "@/lib/db";
import { buildAnonExclusions, buildExclusions, type Exclusions } from "@/lib/exclusions";
import { getCandidates, getReplacementCandidate, LlmError, type LlmPrompt } from "@/lib/llm";
import { forYouPrompt, replacePrompt, wizardPrompt } from "@/lib/prompts";
import { StoredAnswersSchema, type Candidate, type SwapReason } from "@/lib/schemas";
import { feedbackTitles, getTaste, type GenreWeights } from "@/lib/taste";
import {
  discoverMovies,
  getMovie,
  getSimilar,
  resolveCandidate,
  TmdbError,
  type DiscoverQuery,
} from "@/lib/tmdb";
import { mergeTmdbHints, type TmdbHint, type WizardAnswers } from "@/lib/wizard";

/**
 * The recommendation pipeline (SPEC §3): cache → prompt → LLM → TMDB
 * resolution → backfill → persist. Everything rendered afterwards is read back
 * from the DB, so a results page never recomputes.
 *
 * Degradation ladder (SPEC §7): if the LLM fails, TMDB `/discover` driven by
 * the wizard config still yields five verified films. Only when TMDB is also
 * unreachable does the user see an error — never unverified LLM output.
 */

export const BATCH_SIZE = 5;

export type RecSource = "llm" | "cache" | "fallback";

export type Pick = { movie: Movie; reason: string };

export type Viewer = {
  userId: string | null;
  /** Cookie-tracked sessions of an anonymous viewer (empty when logged in). */
  anonSessionIds: readonly string[];
};

export class RecommendUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RecommendUnavailableError";
  }
}

/** Stored in `RecSession.answers`; `source` lets the UI be honest about fallbacks. */
export type StoredAnswers = WizardAnswers & { source: RecSource };

// ---------- building blocks ----------

export async function exclusionsFor(viewer: Viewer): Promise<Exclusions> {
  return viewer.userId
    ? buildExclusions(viewer.userId)
    : buildAnonExclusions(viewer.anonSessionIds);
}

/** Collects picks while enforcing "no repeats, no exclusions" on every add. */
class PickSet {
  readonly picks: Pick[] = [];
  private readonly taken = new Set<number>();

  constructor(
    private readonly exclusions: Exclusions,
    /** Hard constraints the LLM is told about but can't be trusted to keep. */
    private readonly accepts: (movie: Movie) => boolean = () => true,
    private readonly size: number = BATCH_SIZE,
  ) {}

  has(id: number): boolean {
    return this.taken.has(id) || this.exclusions.ids.has(id);
  }

  add(pick: Pick): boolean {
    if (this.full || this.has(pick.movie.id)) return false;
    if (!this.accepts(pick.movie)) {
      console.log(`[recommend] rejected "${pick.movie.title}" (${pick.movie.year}): off-brief`);
      return false;
    }
    this.taken.add(pick.movie.id);
    this.picks.push(pick);
    return true;
  }

  get missing(): number {
    return this.size - this.picks.length;
  }

  get full(): boolean {
    return this.missing <= 0;
  }
}

/**
 * Resolves candidates in parallel; one bad title never sinks the batch. Throws
 * `TmdbError` only when every lookup failed on transport (TMDB is down), so the
 * caller can tell "nothing matched" from "nothing answered".
 */
async function resolveAll(candidates: readonly Candidate[]): Promise<Pick[]> {
  const settled = await Promise.allSettled(candidates.map((c) => resolveCandidate(c)));
  if (settled.every((result) => result.status === "rejected")) {
    throw new TmdbError("TMDB unreachable while resolving candidates", {
      cause: (settled[0] as PromiseRejectedResult | undefined)?.reason,
    });
  }

  const picks: Pick[] = [];
  settled.forEach((result, index) => {
    const candidate = candidates[index];
    if (result.status === "fulfilled" && result.value && candidate) {
      picks.push({ movie: result.value, reason: candidate.reason });
    }
  });
  return picks;
}

/** SPEC §3 step 5: fill gaps from TMDB's neighbours of the best-rated pick. */
async function backfillSimilar(set: PickSet): Promise<void> {
  const anchor = [...set.picks].sort((a, b) => (b.movie.rating ?? 0) - (a.movie.rating ?? 0))[0];
  if (!anchor || set.full) return;

  const similar = await getSimilar(anchor.movie.id);
  for (const summary of similar) {
    if (set.full) break;
    if (set.has(summary.id)) continue;
    try {
      const movie = await getMovie(summary.id);
      set.add({ movie, reason: `Similar to ${anchor.movie.title}, which fits your picks.` });
    } catch {
      // A single detail fetch failing just means "try the next neighbour".
    }
  }
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j] as T, items[i] as T];
  }
  return items;
}

/**
 * Fills from TMDB `/discover`. Picks are sampled from the top results rather
 * than taken in order, so repeating a path doesn't replay the same five, and
 * the query is relaxed (keywords, then page 2) when it comes back thin.
 */
async function backfillDiscover(
  set: PickSet,
  query: DiscoverQuery,
  reasonFor: (movie: Movie, index: number) => string,
): Promise<void> {
  const attempts: DiscoverQuery[] = [
    query,
    { ...query, keywordIds: undefined },
    { ...query, keywordIds: undefined, page: 2 },
    { ...query, keywordIds: undefined, yearFrom: undefined, yearTo: undefined },
  ];

  for (const attempt of attempts) {
    if (set.full) return;
    const results = await discoverMovies(attempt);
    const pool = shuffle(results.filter((r) => !set.has(r.id)).slice(0, 15));
    const settled = await Promise.allSettled(
      pool.slice(0, set.missing + 2).map((r) => getMovie(r.id)),
    );
    const movies = settled
      .flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    for (const movie of movies) {
      set.add({ movie, reason: reasonFor(movie, set.picks.length) });
    }
  }
}

/** Runs a step that may hit TMDB, but lets the ladder continue if it fails. */
async function attempt(label: string, step: () => Promise<void>): Promise<void> {
  try {
    await step();
  } catch (error) {
    console.warn(`[recommend] ${label} failed:`, (error as Error).message);
  }
}

/** LLM → resolve → similar-backfill. Returns the source it ended up with. */
async function fillFromLlm(set: PickSet, prompt: LlmPrompt): Promise<RecSource> {
  try {
    const candidates = await getCandidates(prompt);
    for (const pick of await resolveAll(candidates)) set.add(pick);
  } catch (error) {
    if (!(error instanceof LlmError) && !(error instanceof TmdbError)) throw error;
    console.warn(`[recommend] LLM path failed, falling back to discover:`, error.message);
    return "fallback";
  }

  if (!set.full && set.picks.length > 0) await attempt("similar backfill", () => backfillSimilar(set));
  return "llm";
}

function ensureFull(set: PickSet): Pick[] {
  if (!set.full) {
    throw new RecommendUnavailableError(
      `Only ${set.picks.length} verified picks could be assembled`,
    );
  }
  return set.picks;
}

export async function persistSession(input: {
  type: SessionType;
  userId: string | null;
  answers: Prisma.InputJsonValue | null;
  pathHash: string | null;
  picks: readonly Pick[];
}): Promise<string> {
  const session = await db.recSession.create({
    data: {
      type: input.type,
      userId: input.userId,
      answers: input.answers ?? undefined,
      pathHash: input.pathHash,
      movies: {
        create: input.picks.map((pick, index) => ({
          movieId: pick.movie.id,
          reason: pick.reason,
          rank: index + 1,
        })),
      },
    },
    select: { id: true },
  });
  return session.id;
}

async function tasteSummaryOf(userId: string | null): Promise<string | undefined> {
  if (!userId) return undefined;
  const profile = await db.tasteProfile.findUnique({
    where: { userId },
    select: { tasteSummary: true },
  });
  return profile?.tasteSummary || undefined;
}

/**
 * The era the user tapped is a hard filter: one year of slack for
 * release-date quirks, none beyond.
 */
function withinEra(hints: TmdbHint): (movie: Movie) => boolean {
  return (movie) => {
    if (movie.year === null) return true;
    if (hints.yearFrom !== undefined && movie.year < hints.yearFrom - 1) return false;
    if (hints.yearTo !== undefined && movie.year > hints.yearTo + 1) return false;
    return true;
  };
}

// ---------- wizard ----------

/**
 * Fallback reasons can only claim what the TMDB filter guarantees: it matches
 * the path, and it clears the rating floor in `discoverMovies`.
 */
const FALLBACK_REASONS = [
  (path: string) => `A well-loved pick that fits your ${path} mood.`,
  (path: string) => `Viewers rate it highly, and it sits right in ${path} territory.`,
  (path: string) => `A crowd favourite that matches tonight's ${path} brief.`,
  (path: string) => `Strong reviews and squarely ${path} — a safe bet tonight.`,
  (path: string) => `Fits your ${path} picks and holds up on a rewatch.`,
];

function fallbackReason(answers: WizardAnswers): (movie: Movie, index: number) => string {
  const path = answers.steps
    .map((step) => step.label)
    .filter((label) => label !== "Surprise me")
    .join(", ")
    .toLowerCase();
  if (!path) return () => "A widely loved pick — a safe bet for tonight.";
  return (_movie, index) =>
    (FALLBACK_REASONS[index % FALLBACK_REASONS.length] ?? FALLBACK_REASONS[0]!)(path);
}

export type RecommendResult = { sessionId: string; source: RecSource };

type WizardOptions = {
  /** Movies the viewer just turned down as a batch ("None of these", F-15). */
  rejected?: readonly Movie[];
};

export async function recommendWizard(
  answers: WizardAnswers,
  viewer: Viewer,
  options: WizardOptions = {},
): Promise<RecommendResult> {
  const rejected = options.rejected ?? [];
  const base = await exclusionsFor(viewer);
  const exclusions: Exclusions = {
    ids: new Set([...base.ids, ...rejected.map((movie) => movie.id)]),
    titles: [...new Set([...base.titles, ...rejected.map((movie) => movie.title)])],
  };
  // A rejected batch may be the cached one, and its replacement shouldn't
  // become the path's shared answer either.
  const cacheable = viewer.userId === null && !answers.note && rejected.length === 0;
  const pathHash = cacheable ? pathHashOf(answers.byStep) : null;

  // 1. Shared cache — skipped if it would show this viewer something they've had.
  if (pathHash) {
    const cached = await findCachedPicks(pathHash);
    if (cached && !cached.some((pick) => exclusions.ids.has(pick.movie.id))) {
      console.log(`[cache] hit ${pathHash.slice(0, 12)} "${answers.readablePath}"`);
      const stored: StoredAnswers = { ...answers, source: "cache" };
      const sessionId = await persistSession({
        type: "WIZARD",
        userId: null,
        answers: stored,
        pathHash: null,
        picks: cached,
      });
      return { sessionId, source: "cache" };
    }
    console.log(`[cache] miss ${pathHash.slice(0, 12)} "${answers.readablePath}"`);
  }

  // 2–5. LLM, then TMDB-only rungs of the ladder.
  const hints = mergeTmdbHints(STEP_TREE, answers);
  const set = new PickSet(exclusions, withinEra(hints));
  const tasteSummary = await tasteSummaryOf(viewer.userId);
  if (tasteSummary) console.log(`[recommend] wizard prompt includes taste block`);
  const prompt = wizardPrompt({
    readablePath: answers.readablePath,
    note: answers.note,
    tasteSummary,
    exclude: exclusions.titles,
  });
  const source = await fillFromLlm(set, prompt);

  if (!set.full) {
    await attempt("discover backfill", () => backfillDiscover(set, hints, fallbackReason(answers)));
  }

  // 6. Persist. Only clean LLM runs seed the shared cache.
  const stored: StoredAnswers = { ...answers, source };
  const sessionId = await persistSession({
    type: "WIZARD",
    userId: viewer.userId,
    answers: stored,
    pathHash: source === "llm" ? pathHash : null,
    picks: ensureFull(set),
  });
  console.log(`[recommend] wizard session ${sessionId} via ${source}`);
  return { sessionId, source };
}

// ---------- Surprise me (F-14) ----------

/**
 * One tap from home: a synthetic wizard path, so it reuses the whole pipeline
 * — taste block when signed in, fallback, exclusions. Keyed by day, so
 * anonymous visitors share one cached batch per day.
 */
export async function recommendSurprise(viewer: Viewer): Promise<RecommendResult> {
  const day = new Date().toISOString().slice(0, 10);
  const answers: WizardAnswers = {
    steps: [{ stepId: "surprise", optionId: day, label: "Surprise me" }],
    byStep: { surprise: day },
    readablePath:
      "Surprise me — a varied mix across genres and decades: crowd-pleasers plus a hidden gem",
  };
  return recommendWizard(answers, viewer);
}

// ---------- None of these (F-15) ----------

/**
 * Re-runs an earlier wizard (or Surprise) session's brief as a brand-new
 * session, with its five excluded. Owner / cookie-vouched creator only.
 */
export async function recommendAgain(sessionId: string, viewer: Viewer): Promise<RecommendResult> {
  const session = await db.recSession.findUnique({
    where: { id: sessionId },
    include: { movies: { include: { movie: true } } },
  });
  if (!session || !ownsSession(session, viewer)) throw new NotAllowedError("Not your session");
  if (session.type !== "WIZARD") throw new NotAllowedError("Only wizard sessions can be rerun");

  const stored = StoredAnswersSchema.safeParse(session.answers);
  if (!stored.success) throw new NotAllowedError("Session has no brief to rerun");
  const { steps, byStep, readablePath, note } = stored.data;
  const answers: WizardAnswers = { steps, byStep, readablePath, ...(note ? { note } : {}) };

  return recommendWizard(answers, viewer, { rejected: session.movies.map((rec) => rec.movie) });
}

// ---------- For You ----------

const FOR_YOU_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export type RefreshGate = { allowed: true } | { allowed: false; nextAt: Date };

/**
 * One regeneration per 12h, unless the user has given new signals since the
 * last batch — then their feed should react immediately (SPEC §2.2).
 */
export async function forYouRefreshGate(userId: string): Promise<RefreshGate> {
  const latest = await db.recSession.findFirst({
    where: { userId, type: "FOR_YOU" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!latest) return { allowed: true };

  const nextAt = new Date(latest.createdAt.getTime() + FOR_YOU_COOLDOWN_MS);
  if (nextAt.getTime() <= Date.now()) return { allowed: true };

  const fresh = await db.movieFeedback.count({
    where: { userId, createdAt: { gt: latest.createdAt } },
  });
  return fresh > 0 ? { allowed: true } : { allowed: false, nextAt };
}

export class CooldownError extends Error {
  constructor(readonly nextAt: Date) {
    super(`For You refresh locked until ${nextAt.toISOString()}`);
    this.name = "CooldownError";
  }
}

/** Genre label ("sci-fi") → TMDB genre ids, via the wizard's root step config. */
function genreIdsFor(label: string): number[] {
  const root = STEP_TREE.steps[STEP_TREE.rootId];
  const option = root?.options.find((o) => o.label.toLowerCase() === label);
  return option?.tmdb?.genreIds ?? [];
}

function topGenreQuery(weights: GenreWeights, index: number): DiscoverQuery {
  const ranked = Object.keys(weights);
  const genre = ranked.length > 0 ? ranked[index % ranked.length] : undefined;
  return {
    genreIds: genre ? genreIdsFor(genre) : undefined,
    sortBy: "vote_average.desc",
    minVotes: 1000,
  };
}

const FOR_YOU_FALLBACK_REASON = (movie: Movie) =>
  `A highly rated ${movie.year ?? ""} pick in the genres you come back to most.`.replace("  ", " ");

/** Template B batch from the user's profile, never repeating anything (rule 6). */
export async function recommendForYou(userId: string): Promise<RecommendResult> {
  const gate = await forYouRefreshGate(userId);
  if (!gate.allowed) throw new CooldownError(gate.nextAt);

  const [exclusions, taste, titles] = await Promise.all([
    buildExclusions(userId),
    getTaste(userId),
    feedbackTitles(userId),
  ]);
  const genreWeights = taste?.genreWeights ?? {};

  const set = new PickSet(exclusions);
  const source = await fillFromLlm(
    set,
    forYouPrompt({
      tasteSummary: taste?.summary ?? "",
      genreWeights,
      loved: titles.loved,
      exclude: exclusions.titles,
    }),
  );

  for (let round = 0; !set.full && round < 3; round += 1) {
    await attempt("for-you discover backfill", () =>
      backfillDiscover(set, topGenreQuery(genreWeights, round), FOR_YOU_FALLBACK_REASON),
    );
  }

  const sessionId = await persistSession({
    type: "FOR_YOU",
    userId,
    answers: null,
    pathHash: null,
    picks: ensureFull(set),
  });
  console.log(`[recommend] for-you session ${sessionId} via ${source}`);
  return { sessionId, source };
}

// ---------- replace one pick (Template D) ----------

export class NotAllowedError extends Error {}

/** Signed-in sessions belong to their user; anonymous ones to the cookie that made them. */
function ownsSession(session: { id: string; userId: string | null }, viewer: Viewer): boolean {
  return session.userId ? session.userId === viewer.userId : viewer.anonSessionIds.includes(session.id);
}

export type Replacement = { recId: string; rank: number; reason: string; movie: Movie };

/**
 * Swaps the pick at `rank` for a new one, in place (SPEC §4.1, F-14). Works on
 * For You batches and wizard results alike; anonymous viewers may swap only
 * sessions their own cookie vouches for.
 */
export async function replacePick(
  sessionId: string,
  rank: number,
  viewer: Viewer,
  why: SwapReason = "not_for_me",
): Promise<Replacement> {
  const session = await db.recSession.findUnique({
    where: { id: sessionId },
    include: { movies: { orderBy: { rank: "asc" }, include: { movie: true } } },
  });
  if (!session || !ownsSession(session, viewer)) throw new NotAllowedError("Not your session");

  const target = session.movies.find((rec) => rec.rank === rank);
  if (!target) throw new NotAllowedError("No pick at that rank");

  const base = await exclusionsFor(viewer);
  const exclusions: Exclusions = {
    ids: new Set([...base.ids, ...session.movies.map((rec) => rec.movieId)]),
    titles: base.titles,
  };

  const answers = StoredAnswersSchema.safeParse(session.answers);
  const hints = answers.success ? mergeTmdbHints(STEP_TREE, answers.data) : {};
  const summary = await tasteSummaryOf(viewer.userId);
  const tasteLine = answers.success
    ? `Tonight's preferences: ${answers.data.readablePath}${summary ? `. General taste: ${summary}` : ""}`
    : (summary ?? "Broad, well-reviewed crowd-pleasers.");

  const set = new PickSet(exclusions, withinEra(hints), 1);
  try {
    const candidate = await getReplacementCandidate(
      replacePrompt({
        taste: tasteLine,
        rejected: target.movie.title,
        why,
        currentBatch: session.movies.filter((rec) => rec.rank !== rank).map((rec) => rec.movie.title),
        exclude: exclusions.titles,
      }),
    );
    const movie = await resolveCandidate(candidate);
    if (movie) set.add({ movie, reason: candidate.reason });
  } catch (error) {
    if (!(error instanceof LlmError) && !(error instanceof TmdbError)) throw error;
    console.warn(`[recommend] replace via LLM failed, using discover:`, error.message);
  }

  if (!set.full) {
    const weights = (await getTaste(viewer.userId ?? ""))?.genreWeights ?? {};
    const query = answers.success ? hints : topGenreQuery(weights, 0);
    const reason = answers.success
      ? fallbackReason(answers.data)
      : (movie: Movie) => FOR_YOU_FALLBACK_REASON(movie);
    await attempt("replace discover", () => backfillDiscover(set, query, reason));
  }

  const [pick] = ensureFullOf(set, 1);
  const updated = await db.$transaction(async (tx) => {
    // A swapped session no longer matches its path's cached answer.
    if (session.pathHash) await tx.recSession.update({ where: { id: session.id }, data: { pathHash: null } });
    return tx.recommendation.update({
      where: { id: target.id },
      data: { movieId: pick.movie.id, reason: pick.reason },
    });
  });
  console.log(`[recommend] swapped (${why}) #${rank} "${target.movie.title}" → "${pick.movie.title}"`);
  return { recId: updated.id, rank, reason: pick.reason, movie: pick.movie };
}

function ensureFullOf(set: PickSet, size: number): [Pick] {
  const [pick] = set.picks;
  if (!pick || set.picks.length < size) {
    throw new RecommendUnavailableError("No replacement could be verified");
  }
  return [pick];
}
