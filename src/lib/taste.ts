import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { STEP_TREE } from "@/config/steps";
import { db } from "@/lib/db";
import { getTasteSummary, LlmError } from "@/lib/llm";
import { tasteSummaryPrompt } from "@/lib/prompts";
import { StoredAnswersSchema } from "@/lib/schemas";

/**
 * The taste profile (SPEC §4.2): `genreWeights` is pure arithmetic over wizard
 * history; `tasteSummary` is an LLM paragraph (Template C) regenerated lazily —
 * after 5 new signals or 14 days — never on every tap.
 */

export const REGEN_AFTER_SIGNALS = 5;
const REGEN_AFTER_MS = 14 * 24 * 60 * 60 * 1000;
const HISTORY_SESSIONS = 20;

export type GenreWeights = Record<string, number>;

const GenreWeightsSchema = z.record(z.string(), z.number());

/** Root-step option id → its label ("scifi" → "Sci-Fi"), from the wizard config. */
function genreLabel(optionId: string): string {
  const root = STEP_TREE.steps[STEP_TREE.rootId];
  return root?.options.find((option) => option.id === optionId)?.label.toLowerCase() ?? optionId;
}

/**
 * Frequency with 1/sessionsAgo decay over the root (genre) pick of each wizard
 * session, most recent first, normalized to sum to 1. Pure — unit-testable.
 */
export function computeGenreWeights(genrePicks: readonly string[]): GenreWeights {
  const raw: GenreWeights = {};
  genrePicks.forEach((genre, index) => {
    const label = genreLabel(genre);
    raw[label] = (raw[label] ?? 0) + 1 / (index + 1);
  });

  const total = Object.values(raw).reduce((sum, weight) => sum + weight, 0);
  if (total === 0) return {};

  return Object.fromEntries(
    Object.entries(raw)
      .map(([genre, weight]) => [genre, Math.round((weight / total) * 100) / 100] as const)
      .sort(([, a], [, b]) => b - a),
  );
}

async function recentWizardAnswers(userId: string) {
  const sessions = await db.recSession.findMany({
    where: { userId, type: "WIZARD" },
    orderBy: { createdAt: "desc" },
    take: HISTORY_SESSIONS,
    select: { answers: true },
  });
  return sessions.flatMap((session) => {
    const parsed = StoredAnswersSchema.safeParse(session.answers);
    return parsed.success ? [parsed.data] : [];
  });
}

export function parseGenreWeights(value: Prisma.JsonValue | undefined): GenreWeights {
  const parsed = GenreWeightsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export type TasteSnapshot = {
  summary: string;
  genreWeights: GenreWeights;
  signalCount: number;
};

export async function getTaste(userId: string): Promise<TasteSnapshot | null> {
  const profile = await db.tasteProfile.findUnique({ where: { userId } });
  if (!profile) return null;
  return {
    summary: profile.tasteSummary,
    genreWeights: parseGenreWeights(profile.genreWeights),
    signalCount: profile.signalCount,
  };
}

/** Titles grouped by the signal the user gave them. */
async function feedbackTitles(userId: string) {
  const rows = await db.movieFeedback.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { signal: true, movie: { select: { title: true, year: true } } },
  });
  const label = (movie: { title: string; year: number | null }) =>
    movie.year ? `${movie.title} (${movie.year})` : movie.title;
  return {
    lovedAndSaved: rows.filter((r) => r.signal === "LOVED" || r.signal === "SAVED").map((r) => label(r.movie)),
    notForMe: rows.filter((r) => r.signal === "NOT_FOR_ME").map((r) => label(r.movie)),
    loved: rows.filter((r) => r.signal === "LOVED").map((r) => label(r.movie)),
  };
}

export { feedbackTitles };

/**
 * Lazy regen check (SPEC §4.2). Safe to call from anywhere, any number of
 * times: the counter is claimed with a conditional update first, so
 * concurrent callers can't both fire an LLM call for the same 5 signals.
 * Returns true if a new summary was written.
 */
export async function maybeRegenerateTaste(userId: string): Promise<boolean> {
  const profile = await db.tasteProfile.findUnique({ where: { userId } });
  if (!profile) return false;

  const stale = Date.now() - profile.updatedAt.getTime() > REGEN_AFTER_MS;
  if (profile.signalCount < REGEN_AFTER_SIGNALS && !stale) return false;
  if (profile.signalCount === 0 && profile.tasteSummary) return false;

  const claim = await db.tasteProfile.updateMany({
    where: { userId, signalCount: profile.signalCount },
    data: { signalCount: 0 },
  });
  if (claim.count === 0) return false; // someone else got there first

  try {
    const answers = await recentWizardAnswers(userId);
    const genreWeights = computeGenreWeights(answers.map((a) => a.byStep[STEP_TREE.rootId] ?? "").filter(Boolean));
    const titles = await feedbackTitles(userId);

    const summary = await getTasteSummary(
      tasteSummaryPrompt({
        recentPaths: answers.map((a) => a.readablePath),
        lovedAndSaved: titles.lovedAndSaved,
        notForMe: titles.notForMe,
        previousSummary: profile.tasteSummary,
      }),
    );

    await db.tasteProfile.update({
      where: { userId },
      data: { tasteSummary: summary, genreWeights },
    });
    console.log(`[taste] regen for ${userId} after ${profile.signalCount} signal(s)`);
    return true;
  } catch (error) {
    // Give the signals back so the next check retries.
    await db.tasteProfile.update({
      where: { userId },
      data: { signalCount: { increment: profile.signalCount } },
    });
    if (error instanceof LlmError) {
      console.warn(`[taste] regen failed, will retry:`, error.message);
      return false;
    }
    throw error;
  }
}

/** Keeps weights current between summary regens; cheap, no LLM. */
export async function refreshGenreWeights(userId: string): Promise<GenreWeights> {
  const answers = await recentWizardAnswers(userId);
  const genreWeights = computeGenreWeights(answers.map((a) => a.byStep[STEP_TREE.rootId] ?? "").filter(Boolean));
  await db.tasteProfile.upsert({
    where: { userId },
    create: { userId, genreWeights },
    update: { genreWeights },
  });
  return genreWeights;
}
