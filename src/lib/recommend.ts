import type { Movie, Prisma, SessionType } from "@prisma/client";

import { STEP_TREE } from "@/config/steps";
import { findCachedPicks, pathHashOf } from "@/lib/cache";
import { db } from "@/lib/db";
import { buildAnonExclusions, buildExclusions, type Exclusions } from "@/lib/exclusions";
import { getCandidates, LlmError, type LlmPrompt } from "@/lib/llm";
import { wizardPrompt } from "@/lib/prompts";
import type { Candidate } from "@/lib/schemas";
import {
  discoverMovies,
  getMovie,
  getSimilar,
  resolveCandidate,
  TmdbError,
  type DiscoverQuery,
} from "@/lib/tmdb";
import { mergeTmdbHints, type WizardAnswers } from "@/lib/wizard";

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
    return BATCH_SIZE - this.picks.length;
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
  return (_movie, index) =>
    (FALLBACK_REASONS[index % FALLBACK_REASONS.length] ?? FALLBACK_REASONS[0]!)(path);
}

export type RecommendResult = { sessionId: string; source: RecSource };

export async function recommendWizard(
  answers: WizardAnswers,
  viewer: Viewer,
): Promise<RecommendResult> {
  const exclusions = await exclusionsFor(viewer);
  const cacheable = viewer.userId === null && !answers.note;
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

  // 2–5. LLM, then TMDB-only rungs of the ladder. The era the user tapped is a
  // hard filter: one year of slack for release-date quirks, none beyond.
  const hints = mergeTmdbHints(STEP_TREE, answers);
  const set = new PickSet(exclusions, (movie) => {
    if (movie.year === null) return true;
    if (hints.yearFrom !== undefined && movie.year < hints.yearFrom - 1) return false;
    if (hints.yearTo !== undefined && movie.year > hints.yearTo + 1) return false;
    return true;
  });
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
