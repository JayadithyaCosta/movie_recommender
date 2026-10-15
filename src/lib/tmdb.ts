import type { Movie, Prisma } from "@prisma/client";
import type { z } from "zod";

import { db } from "@/lib/db";
import { requireEnv } from "@/lib/env";
import {
  TmdbMovieDetail,
  TmdbPage,
  TmdbWatchProviders,
  type TmdbMovieSummary,
  type TmdbRegionProviders,
} from "@/lib/schemas";

/**
 * The app's only door to TMDB (SPEC §5). Everything that is ever displayed about
 * a film comes through here and lands in the `Movie` table first — the LLM only
 * proposes titles (CLAUDE.md rule 1). Never import this from a client component.
 */

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";
const TIMEOUT_MS = 8_000;
/** Below this, a search hit is usually a namesake short or a fan upload. */
export const MIN_VOTE_COUNT = 50;
const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
export const DEFAULT_REGION = "US";

export class TmdbError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TmdbError";
  }
}

type Query = Record<string, string | number | boolean | undefined>;

type FetchOptions = {
  /** Next.js data-cache lifetime; ignored outside the Next runtime. */
  revalidate?: number;
};

function isRetryable(error: unknown): boolean {
  if (error instanceof TmdbError) return false;
  // Network failures and our own timeout surface as TypeError / DOMException.
  return true;
}

/**
 * One GET with an 8s timeout and a single retry on network errors and 5xx
 * (SPEC §5). 4xx is never retried — it will not get better by asking again.
 */
async function tmdbFetch<S extends z.ZodType>(
  path: string,
  query: Query,
  schema: S,
  options: FetchOptions = {},
): Promise<{ data: z.infer<S>; raw: unknown }> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${requireEnv("TMDB_READ_TOKEN")}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        ...(options.revalidate !== undefined
          ? { next: { revalidate: options.revalidate } }
          : { cache: "no-store" as const }),
      });

      if (response.status >= 500) {
        lastError = new Error(`TMDB ${response.status} on ${path}`);
        continue;
      }
      if (!response.ok) {
        throw new TmdbError(`TMDB ${response.status} on ${path}`);
      }

      const raw: unknown = await response.json();
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        throw new TmdbError(`TMDB returned an unexpected shape for ${path}`, {
          cause: parsed.error,
        });
      }
      return { data: parsed.data, raw };
    } catch (error) {
      if (!isRetryable(error)) throw error;
      lastError = error;
    }
  }

  throw new TmdbError(`TMDB request failed for ${path}`, { cause: lastError });
}

// ---------- images ----------

export type PosterSize = "w185" | "w342" | "w780";

export function posterUrl(path: string | null | undefined, size: PosterSize = "w342"): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function backdropUrl(path: string | null | undefined): string | null {
  return path ? `${IMAGE_BASE}/w780${path}` : null;
}

export function logoUrl(path: string | null | undefined): string | null {
  return path ? `${IMAGE_BASE}/w92${path}` : null;
}

// ---------- movie cache ----------

function yearOf(releaseDate: string | null | undefined): number | null {
  const year = releaseDate ? Number.parseInt(releaseDate.slice(0, 4), 10) : NaN;
  return Number.isFinite(year) ? year : null;
}

function isFresh(movie: Movie): boolean {
  return Date.now() - movie.fetchedAt.getTime() < REFRESH_AFTER_MS;
}

async function fetchAndStore(id: number): Promise<Movie> {
  const { data, raw } = await tmdbFetch(`/movie/${id}`, {}, TmdbMovieDetail);

  const fields = {
    title: data.title,
    year: yearOf(data.release_date),
    posterPath: data.poster_path ?? null,
    overview: data.overview ?? null,
    rating: data.vote_average ?? null,
    runtime: data.runtime ?? null,
    genres: (data.genres ?? []) as Prisma.InputJsonValue,
    raw: raw as Prisma.InputJsonValue,
    fetchedAt: new Date(),
  };

  return db.movie.upsert({
    where: { id },
    create: { id, ...fields },
    update: fields,
  });
}

/**
 * A cached `Movie`, refreshed from TMDB once it is older than 30 days (SPEC §5).
 * If TMDB is down, a stale row still beats no row (SPEC §7) — it was verified
 * data when it was stored.
 */
export async function getMovie(id: number): Promise<Movie> {
  const cached = await db.movie.findUnique({ where: { id } });
  if (cached && isFresh(cached)) return cached;

  try {
    return await fetchAndStore(id);
  } catch (error) {
    if (cached) {
      console.warn(`[tmdb] serving stale movie ${id}:`, (error as Error).message);
      return cached;
    }
    throw error;
  }
}

/** Movies the app already holds, without touching TMDB. */
export async function getCachedMovie(id: number): Promise<Movie | null> {
  return db.movie.findUnique({ where: { id } });
}

// ---------- search & resolution ----------

async function search(title: string, year?: number): Promise<TmdbMovieSummary | null> {
  const { data } = await tmdbFetch(
    "/search/movie",
    { query: title, year, include_adult: false, language: "en-US" },
    TmdbPage,
    { revalidate: 60 * 60 * 24 },
  );
  return data.results.find((result) => (result.vote_count ?? 0) >= MIN_VOTE_COUNT) ?? null;
}

/**
 * Turns an LLM candidate into a verified, cached `Movie` (SPEC §3 step 4):
 * DB first, then search with the year, then without it. `null` means "drop it
 * and backfill" — never fall back to what the LLM said.
 */
export async function resolveCandidate(candidate: {
  title: string;
  year: number;
}): Promise<Movie | null> {
  const cached = await db.movie.findFirst({
    where: {
      title: { equals: candidate.title, mode: "insensitive" },
      year: candidate.year,
    },
  });
  if (cached && isFresh(cached)) {
    console.log(`[tmdb] db hit "${candidate.title}" (${candidate.year})`);
    return cached;
  }

  const hit = (await search(candidate.title, candidate.year)) ?? (await search(candidate.title));
  if (!hit) {
    console.log(`[tmdb] unresolved "${candidate.title}" (${candidate.year})`);
    return null;
  }
  return getMovie(hit.id);
}

// ---------- discovery ----------

export type DiscoverQuery = {
  genreIds?: number[];
  withoutGenreIds?: number[];
  keywordIds?: number[];
  yearFrom?: number;
  yearTo?: number;
  sortBy?: "popularity.desc" | "vote_average.desc" | "vote_count.desc";
  minVotes?: number;
  maxRuntime?: number;
  page?: number;
};

/**
 * TMDB's own filter-based discovery. It powers the no-LLM fallback, backfill
 * and Surprise me — results are real films by construction, so they never
 * violate rule 1.
 */
export async function discoverMovies(query: DiscoverQuery): Promise<TmdbMovieSummary[]> {
  const { data } = await tmdbFetch(
    "/discover/movie",
    {
      include_adult: false,
      language: "en-US",
      sort_by: query.sortBy ?? "popularity.desc",
      "vote_count.gte": query.minVotes ?? 300,
      // with_genres: comma = AND, pipe = OR. Sub-genre hints are AND-ed onto the genre.
      with_genres: query.genreIds?.length ? query.genreIds.join(",") : undefined,
      without_genres: query.withoutGenreIds?.length ? query.withoutGenreIds.join(",") : undefined,
      with_keywords: query.keywordIds?.length ? query.keywordIds.join("|") : undefined,
      "primary_release_date.gte": query.yearFrom ? `${query.yearFrom}-01-01` : undefined,
      "primary_release_date.lte": query.yearTo ? `${query.yearTo}-12-31` : undefined,
      "with_runtime.lte": query.maxRuntime,
      page: query.page ?? 1,
    },
    TmdbPage,
    { revalidate: 60 * 60 * 12 },
  );
  return data.results;
}

/**
 * Films TMDB considers close to `id`. `/recommendations` is behaviour-based and
 * usually better than the metadata-based `/similar`, so it goes first.
 */
export async function getSimilar(id: number): Promise<TmdbMovieSummary[]> {
  for (const path of [`/movie/${id}/recommendations`, `/movie/${id}/similar`]) {
    const { data } = await tmdbFetch(path, { language: "en-US" }, TmdbPage, {
      revalidate: 60 * 60 * 24,
    });
    const usable = data.results.filter((result) => (result.vote_count ?? 0) >= MIN_VOTE_COUNT);
    if (usable.length > 0) return usable;
  }
  return [];
}

// ---------- watch providers ----------

export type WatchProviders = TmdbRegionProviders & { region: string };

/** Region from `Accept-Language` ("en-GB,en;q=0.9" → "GB"), default US. */
export function regionFromAcceptLanguage(header: string | null | undefined): string {
  const match = /[a-z]{2,3}-([A-Z]{2})/i.exec(header ?? "");
  return match?.[1]?.toUpperCase() ?? DEFAULT_REGION;
}

/** Providers for `region`, falling back to US when the region has none (SPEC §5). */
export async function getWatchProviders(
  id: number,
  region: string,
): Promise<WatchProviders | null> {
  const { data } = await tmdbFetch(`/movie/${id}/watch/providers`, {}, TmdbWatchProviders, {
    revalidate: 60 * 60 * 24,
  });
  const local = data.results[region];
  if (local) return { ...local, region };
  const fallback = data.results[DEFAULT_REGION];
  return fallback ? { ...fallback, region: DEFAULT_REGION } : null;
}
