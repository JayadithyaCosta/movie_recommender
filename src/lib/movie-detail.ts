import { headers } from "next/headers";

import { getViewerMovieStates, type ViewerMovieState } from "@/lib/feedback";
import { toMovieView, type MovieView } from "@/lib/movie-view";
import { getMovie, getWatchProviders, regionFromAcceptLanguage, type WatchProviders } from "@/lib/tmdb";
import { getUserId } from "@/lib/viewer";

export type MovieDetailData = {
  movie: MovieView;
  providers: WatchProviders | null;
  providersFailed: boolean;
  signedIn: boolean;
  state: ViewerMovieState;
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

  const userId = await getUserId();
  const state = (await getViewerMovieStates(userId, [id]))[id] ?? { saved: false, signal: null };
  const base = { movie: toMovieView(movie), signedIn: userId !== null, state };

  const region = regionFromAcceptLanguage((await headers()).get("accept-language"));
  try {
    return { ...base, providers: await getWatchProviders(id, region), providersFailed: false };
  } catch {
    return { ...base, providers: null, providersFailed: true };
  }
}
