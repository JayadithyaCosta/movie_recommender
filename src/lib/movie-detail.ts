import { headers } from "next/headers";

import { toMovieView, type MovieView } from "@/lib/movie-view";
import { getMovie, getWatchProviders, regionFromAcceptLanguage, type WatchProviders } from "@/lib/tmdb";

export type MovieDetailData = {
  movie: MovieView;
  providers: WatchProviders | null;
  providersFailed: boolean;
};

/**
 * Detail for one film: cached `Movie` + live providers for the viewer's region
 * (SPEC §5). A providers failure degrades to a note, not an error page.
 * Returns null for ids TMDB doesn't know.
 */
export async function loadMovieDetail(id: number): Promise<MovieDetailData | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  let movie;
  try {
    movie = await getMovie(id);
  } catch {
    return null;
  }

  const region = regionFromAcceptLanguage((await headers()).get("accept-language"));
  try {
    return { movie: toMovieView(movie), providers: await getWatchProviders(id, region), providersFailed: false };
  } catch {
    return { movie: toMovieView(movie), providers: null, providersFailed: true };
  }
}
