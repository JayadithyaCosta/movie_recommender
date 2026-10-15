/**
 * Live check for F-04: a title+year resolves to a cached `Movie` row with a
 * poster, and the second lookup is served from the DB, not TMDB.
 *
 * Run with `make tmdb-smoke` (needs `make db-up` and TMDB_READ_TOKEN).
 */

import { db } from "../src/lib/db";
import { getWatchProviders, posterUrl, resolveCandidate } from "../src/lib/tmdb";

async function main(): Promise<void> {
  const candidate = { title: "Hereditary", year: 2018 };

  for (const label of ["first lookup", "repeat lookup"]) {
    const started = Date.now();
    const movie = await resolveCandidate(candidate);
    if (!movie) throw new Error("Hereditary (2018) did not resolve");
    console.log(
      `${label}: #${movie.id} ${movie.title} (${movie.year}) ★${movie.rating} ${movie.runtime}min ` +
        `poster=${posterUrl(movie.posterPath)} in ${Date.now() - started}ms`,
    );
  }

  const unresolved = await resolveCandidate({ title: "Zzqx Nonexistent Film", year: 2019 });
  console.log(`nonsense title resolves to: ${unresolved === null ? "null (dropped)" : "SOMETHING?!"}`);

  const providers = await getWatchProviders(493922, "GB");
  console.log(`providers (${providers?.region}):`, providers?.flatrate?.map((p) => p.provider_name));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
