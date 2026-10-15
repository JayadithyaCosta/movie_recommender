import { createHash } from "node:crypto";

import type { Movie } from "@prisma/client";

import { db } from "@/lib/db";
import type { WizardAnswers } from "@/lib/wizard";

/**
 * The shared 7-day wizard cache (SPEC §3 step 1). Only anonymous, note-free
 * wizard runs read or write it — anything personalized would leak one user's
 * taste into another's results.
 */

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Key order must not matter, so the map is sorted before hashing. */
export function pathHashOf(byStep: WizardAnswers["byStep"]): string {
  const normalized = Object.entries(byStep)
    .map(([step, option]) => [step.trim().toLowerCase(), option.trim().toLowerCase()])
    .sort(([a], [b]) => (a ?? "").localeCompare(b ?? ""));
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export type CachedPick = { movie: Movie; reason: string };

/**
 * The newest fresh session for this path, as ranked picks. Clones never carry
 * a `pathHash`, so the cache entry still expires 7 days after the original
 * LLM run instead of being renewed forever by its own copies.
 */
export async function findCachedPicks(pathHash: string): Promise<CachedPick[] | null> {
  const session = await db.recSession.findFirst({
    where: { pathHash, type: "WIZARD", createdAt: { gte: new Date(Date.now() - TTL_MS) } },
    orderBy: { createdAt: "desc" },
    include: { movies: { orderBy: { rank: "asc" }, include: { movie: true } } },
  });
  if (!session || session.movies.length < 5) return null;
  return session.movies.map((rec) => ({ movie: rec.movie, reason: rec.reason }));
}
