import Image from "next/image";

import { backdropUrl, logoUrl } from "@/lib/images";
import type { MovieView } from "@/lib/movie-view";
import type { WatchProviders } from "@/lib/tmdb";

import { MovieMeta } from "./movie-meta";
import { Poster } from "./poster";
import { SaveButton } from "./save-button";

type ProviderGroup = { label: string; items: NonNullable<WatchProviders["flatrate"]> };

function groups(providers: WatchProviders | null): ProviderGroup[] {
  if (!providers) return [];
  return [
    { label: "Stream", items: [...(providers.flatrate ?? []), ...(providers.free ?? []), ...(providers.ads ?? [])] },
    { label: "Rent", items: providers.rent ?? [] },
    { label: "Buy", items: providers.buy ?? [] },
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item, index, all) => all.findIndex((other) => other.provider_id === item.provider_id) === index,
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/** Full detail: shared by the `/movie/[id]` page and the intercepted sheet. */
export function MovieDetail({
  movie,
  providers,
  providersFailed = false,
  signedIn,
  state,
}: {
  movie: MovieView;
  providers: WatchProviders | null;
  providersFailed?: boolean;
  signedIn: boolean;
  state: { saved: boolean };
}) {
  const backdrop = backdropUrl(movie.backdropPath);
  const providerGroups = groups(providers);

  return (
    <article className="flex flex-col">
      <div className="relative aspect-video w-full overflow-hidden bg-surface">
        {backdrop ? (
          <Image src={backdrop} alt="" fill sizes="(min-width: 768px) 672px, 100vw" className="object-cover" priority />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="relative -mt-16 flex flex-col gap-5 px-5 pb-8 sm:px-6">
        <div className="flex items-end gap-4">
          <Poster path={movie.posterPath} title={movie.title} sizes="112px" className="w-24 shrink-0 shadow-2xl sm:w-28" />
          <div className="min-w-0 space-y-1 pb-1">
            <h1 className="text-2xl leading-tight font-semibold text-balance sm:text-3xl">{movie.title}</h1>
            <MovieMeta year={movie.year} runtime={movie.runtime} rating={movie.rating} />
          </div>
        </div>

        <div>
          <SaveButton movieId={movie.id} initialSaved={state.saved} signedIn={signedIn} />
        </div>

        {movie.genres.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Genres">
            {movie.genres.map((genre) => (
              <li key={genre} className="rounded-full bg-surface px-3 py-1 text-sm text-muted ring-1 ring-white/10">
                {genre}
              </li>
            ))}
          </ul>
        ) : null}

        {movie.tagline ? <p className="text-base text-foreground/70 italic">{movie.tagline}</p> : null}
        {movie.overview ? <p className="text-base leading-relaxed text-foreground/90">{movie.overview}</p> : null}

        <section aria-labelledby="where-to-watch" className="space-y-3">
          <h2 id="where-to-watch" className="text-lg font-semibold">
            Where to watch{providers ? <span className="text-sm font-normal text-muted"> · {providers.region}</span> : null}
          </h2>

          {providerGroups.length > 0 ? (
            <div className="space-y-3">
              {providerGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <h3 className="text-xs tracking-wider text-muted uppercase">{group.label}</h3>
                  <ul className="flex flex-wrap gap-2">
                    {group.items.map((item) => {
                      const logo = logoUrl(item.logo_path);
                      return (
                        <li key={item.provider_id} className="flex items-center gap-2 rounded-xl bg-surface py-1.5 pr-3 pl-1.5 ring-1 ring-white/10">
                          {logo ? (
                            <Image src={logo} alt="" width={28} height={28} className="rounded-md" />
                          ) : null}
                          <span className="text-sm">{item.provider_name}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              {providersFailed
                ? "Streaming info is unavailable right now."
                : "Not streaming anywhere we know of in your region yet."}
            </p>
          )}

          <p className="text-xs text-muted">
            Streaming data from{" "}
            <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              JustWatch
            </a>{" "}
            via TMDB.{" "}
            {providers?.link ? (
              <a href={providers.link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                See all options
              </a>
            ) : null}
          </p>
        </section>

        <p className="text-xs text-muted">
          Film data from{" "}
          <a
            href={`https://www.themoviedb.org/movie/${movie.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            TMDB
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>
    </article>
  );
}
