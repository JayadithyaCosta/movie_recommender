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

/** Add to / remove from the watchlist. */
export async function setSaved(userId: string, movieId: number, on: boolean): Promise<void> {
  await assertMovie(movieId);
  if (on) {
    await db.savedMovie.upsert({
      where: { userId_movieId: { userId, movieId } },
      create: { userId, movieId },
      update: {},
    });
  } else {
    await db.savedMovie.deleteMany({ where: { userId, movieId } });
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
