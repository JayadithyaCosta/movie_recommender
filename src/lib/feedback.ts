import type { Signal } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Card actions (SPEC §4.1). `SavedMovie` is the watchlist; `MovieFeedback`
 * holds one signal per (user, movie) — the latest tap wins.
 */

export class UnknownMovieError extends Error {}

async function assertMovie(movieId: number): Promise<void> {
  const exists = await db.movie.findUnique({ where: { id: movieId }, select: { id: true } });
  if (!exists) throw new UnknownMovieError(`Movie ${movieId} is not cached`);
}

/**
 * Every new signal bumps the counter that lazily triggers a taste-summary
 * regen (SPEC §4.2). Undoing a tap does not count.
 */
async function countSignal(userId: string): Promise<void> {
  await db.tasteProfile.upsert({
    where: { userId },
    create: { userId, genreWeights: {}, signalCount: 1 },
    update: { signalCount: { increment: 1 } },
  });
}

/**
 * Add to / remove from the watchlist. Saving also records a SAVED signal, but
 * never over a stronger one the user already gave (one signal per movie, and
 * "loved it" says more than "maybe later").
 */
export async function setSaved(userId: string, movieId: number, on: boolean): Promise<void> {
  await assertMovie(movieId);
  if (on) {
    await db.$transaction([
      db.savedMovie.upsert({
        where: { userId_movieId: { userId, movieId } },
        create: { userId, movieId },
        update: {},
      }),
      db.movieFeedback.upsert({
        where: { userId_movieId: { userId, movieId } },
        create: { userId, movieId, signal: "SAVED" },
        update: {},
      }),
    ]);
    await countSignal(userId);
  } else {
    await db.$transaction([
      db.savedMovie.deleteMany({ where: { userId, movieId } }),
      db.movieFeedback.deleteMany({ where: { userId, movieId, signal: "SAVED" } }),
    ]);
  }
}

/** ❤️ / 👁 / ✕ — one upserted row per (user, movie); the latest tap wins. */
export async function setSignal(
  userId: string,
  movieId: number,
  signal: Exclude<Signal, "SAVED">,
  on: boolean,
): Promise<void> {
  await assertMovie(movieId);
  if (on) {
    await db.movieFeedback.upsert({
      where: { userId_movieId: { userId, movieId } },
      create: { userId, movieId, signal },
      update: { signal, createdAt: new Date() },
    });
    await countSignal(userId);
  } else {
    await db.movieFeedback.deleteMany({ where: { userId, movieId, signal } });
  }
}

export type ViewerMovieState = {
  saved: boolean;
  signal: Signal | null;
};

/** Per-card state for the movies on screen, in one round trip each. */
export async function getViewerMovieStates(
  userId: string | null,
  movieIds: readonly number[],
): Promise<Record<number, ViewerMovieState>> {
  const state: Record<number, ViewerMovieState> = {};
  for (const id of movieIds) state[id] = { saved: false, signal: null };
  if (!userId || movieIds.length === 0) return state;

  const [saved, feedback] = await Promise.all([
    db.savedMovie.findMany({ where: { userId, movieId: { in: [...movieIds] } }, select: { movieId: true } }),
    db.movieFeedback.findMany({
      where: { userId, movieId: { in: [...movieIds] } },
      select: { movieId: true, signal: true },
    }),
  ]);
  for (const row of saved) state[row.movieId] = { ...state[row.movieId]!, saved: true };
  for (const row of feedback) state[row.movieId] = { ...state[row.movieId]!, signal: row.signal };
  return state;
}
