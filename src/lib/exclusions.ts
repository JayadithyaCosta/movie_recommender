import { db } from "@/lib/db";

/**
 * What a rec call must never return (CLAUDE.md rule 6): titles from past
 * recommendations plus SEEN / NOT_FOR_ME feedback, most recent first, capped
 * at 60 for the prompt (SPEC §3). `ids` is the post-resolution safety net and
 * is not capped — filtering is free, prompt tokens are not.
 */

const PROMPT_CAP = 60;

export type Exclusions = {
  ids: Set<number>;
  /** "Title (Year)" strings for the EXCLUDE line of the prompt. */
  titles: string[];
};

type Dated = { id: number; label: string; at: Date };

function label(movie: { title: string; year: number | null }): string {
  return movie.year ? `${movie.title} (${movie.year})` : movie.title;
}

function assemble(entries: Dated[]): Exclusions {
  entries.sort((a, b) => b.at.getTime() - a.at.getTime());
  const ids = new Set<number>();
  const titles: string[] = [];
  for (const entry of entries) {
    if (ids.has(entry.id)) continue;
    ids.add(entry.id);
    if (titles.length < PROMPT_CAP) titles.push(entry.label);
  }
  return { ids, titles };
}

export async function buildExclusions(userId: string): Promise<Exclusions> {
  const [recs, feedback] = await Promise.all([
    db.recommendation.findMany({
      where: { session: { userId } },
      select: { movie: { select: { id: true, title: true, year: true } }, session: { select: { createdAt: true } } },
      orderBy: { session: { createdAt: "desc" } },
      take: 300,
    }),
    db.movieFeedback.findMany({
      where: { userId, signal: { in: ["SEEN", "NOT_FOR_ME"] } },
      select: { createdAt: true, movie: { select: { id: true, title: true, year: true } } },
    }),
  ]);

  return assemble([
    ...recs.map((rec) => ({ id: rec.movie.id, label: label(rec.movie), at: rec.session.createdAt })),
    ...feedback.map((f) => ({ id: f.movie.id, label: label(f.movie), at: f.createdAt })),
  ]);
}

/** Anonymous users: everything already shown in their cookie-tracked sessions. */
export async function buildAnonExclusions(sessionIds: readonly string[]): Promise<Exclusions> {
  if (sessionIds.length === 0) return { ids: new Set(), titles: [] };
  const recs = await db.recommendation.findMany({
    where: { sessionId: { in: [...sessionIds] }, session: { userId: null } },
    select: { movie: { select: { id: true, title: true, year: true } }, session: { select: { createdAt: true } } },
  });
  return assemble(
    recs.map((rec) => ({ id: rec.movie.id, label: label(rec.movie), at: rec.session.createdAt })),
  );
}
