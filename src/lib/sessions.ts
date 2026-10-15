import type { SessionType } from "@prisma/client";

import { db } from "@/lib/db";
import { toMovieView, type MovieView } from "@/lib/movie-view";
import { StoredAnswersSchema, type StoredAnswersShape } from "@/lib/schemas";

/**
 * Read side of recommendation sessions. Results pages render from here only —
 * revisiting a session never re-runs the pipeline (FEATURES F-06).
 */

export type ResultPick = { recId: string; rank: number; reason: string; movie: MovieView };

export type ResultsSession = {
  id: string;
  type: SessionType;
  userId: string | null;
  createdAt: Date;
  answers: StoredAnswersShape | null;
  picks: ResultPick[];
};

export async function getResultsSession(id: string): Promise<ResultsSession | null> {
  const session = await db.recSession.findUnique({
    where: { id },
    include: { movies: { orderBy: { rank: "asc" }, include: { movie: true } } },
  });
  if (!session) return null;

  const answers = StoredAnswersSchema.safeParse(session.answers);

  return {
    id: session.id,
    type: session.type,
    userId: session.userId,
    createdAt: session.createdAt,
    answers: answers.success ? answers.data : null,
    picks: session.movies.map((rec) => ({
      recId: rec.id,
      rank: rec.rank,
      reason: rec.reason,
      movie: toMovieView(rec.movie),
    })),
  };
}

/** The current For You batch — a DB read only, never an LLM call (SPEC §2.2). */
export async function getLatestForYou(userId: string): Promise<ResultsSession | null> {
  const latest = await db.recSession.findFirst({
    where: { userId, type: "FOR_YOU" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return latest ? getResultsSession(latest.id) : null;
}

/** Whether a user has given us anything to learn from yet. */
export async function hasTasteHistory(userId: string): Promise<boolean> {
  const [sessions, signals] = await Promise.all([
    db.recSession.count({ where: { userId, type: "WIZARD" } }),
    db.movieFeedback.count({ where: { userId } }),
  ]);
  return sessions + signals > 0;
}
