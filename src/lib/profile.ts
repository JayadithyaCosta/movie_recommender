import type { SessionType } from "@prisma/client";

import { db } from "@/lib/db";
import { toMovieView, type MovieView } from "@/lib/movie-view";
import { StoredAnswersSchema } from "@/lib/schemas";

export async function getWatchlist(userId: string): Promise<MovieView[]> {
  const rows = await db.savedMovie.findMany({
    where: { userId },
    orderBy: { savedAt: "desc" },
    include: { movie: true },
  });
  return rows.map((row) => toMovieView(row.movie));
}

export type HistoryEntry = {
  id: string;
  type: SessionType;
  label: string;
  createdAt: Date;
  posters: { id: number; title: string; posterPath: string | null }[];
};

export type HistoryGroup = { label: string; entries: HistoryEntry[] };

const DAY_MS = 24 * 60 * 60 * 1000;

function dayLabel(date: Date, now: Date): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / DAY_MS);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString("en-US", { weekday: "long" });
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

/** Recommendation history grouped by day, newest first (SPEC §6). */
export async function getHistory(userId: string, limit = 50): Promise<HistoryGroup[]> {
  const sessions = await db.recSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      movies: {
        orderBy: { rank: "asc" },
        select: { movie: { select: { id: true, title: true, posterPath: true } } },
      },
    },
  });

  const now = new Date();
  const groups: HistoryGroup[] = [];
  for (const session of sessions) {
    const answers = StoredAnswersSchema.safeParse(session.answers);
    const entry: HistoryEntry = {
      id: session.id,
      type: session.type,
      label:
        session.type === "FOR_YOU"
          ? "For You picks"
          : answers.success
            ? answers.data.readablePath.replaceAll(" > ", " · ")
            : "Mood picks",
      createdAt: session.createdAt,
      posters: session.movies.map((rec) => rec.movie),
    };
    const label = dayLabel(session.createdAt, now);
    const group = groups.at(-1);
    if (group?.label === label) group.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }
  return groups;
}
