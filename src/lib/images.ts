/**
 * TMDB image URLs. Pure string helpers with no server imports, so client
 * components can use them too (SPEC §5: w342 for cards, w780 for detail).
 */

const IMAGE_BASE = "https://image.tmdb.org/t/p";

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
