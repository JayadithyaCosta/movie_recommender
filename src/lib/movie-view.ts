import type { Movie } from "@prisma/client";
import { z } from "zod";

import { TmdbGenre, TmdbMovieDetail } from "@/lib/schemas";

/**
 * The display shape of a film. Built only from `Movie` rows — i.e. verified
 * TMDB data (CLAUDE.md rule 1) — and safe to pass to client components.
 */
export type MovieView = {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  rating: number | null;
  runtime: number | null;
  genres: string[];
  overview: string | null;
  tagline: string | null;
};

const Genres = z.array(TmdbGenre);

export function toMovieView(movie: Movie): MovieView {
  const raw = TmdbMovieDetail.safeParse(movie.raw);
  const genres = Genres.safeParse(movie.genres);

  return {
    id: movie.id,
    title: movie.title,
    year: movie.year,
    posterPath: movie.posterPath,
    backdropPath: raw.success ? (raw.data.backdrop_path ?? null) : null,
    rating: movie.rating,
    runtime: movie.runtime,
    genres: genres.success ? genres.data.map((genre) => genre.name) : [],
    overview: movie.overview,
    tagline: raw.success ? raw.data.tagline || null : null,
  };
}

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

export function formatRating(rating: number | null): string | null {
  return rating ? rating.toFixed(1) : null;
}
