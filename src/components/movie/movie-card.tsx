import Link from "next/link";

import type { MovieView } from "@/lib/movie-view";

import { MovieMeta } from "./movie-meta";
import { Poster } from "./poster";

type MovieCardProps = {
  rank: number;
  reason: string;
  movie: MovieView;
  /** Feedback / swap controls — kept outside the link so taps never collide. */
  actions?: React.ReactNode;
  priority?: boolean;
};

/**
 * One ranked pick. Horizontal on phones (poster left, reason right — the
 * reason is the point of the app, so it gets the room); a vertical poster card
 * once five fit across.
 */
export function MovieCard({ rank, reason, movie, actions, priority }: MovieCardProps) {
  return (
    <article className="group flex gap-4 rounded-3xl bg-surface p-3 ring-1 ring-white/5 xl:flex-col xl:gap-3">
      <Link
        href={`/movie/${movie.id}`}
        scroll={false}
        className="relative w-28 shrink-0 rounded-xl focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none sm:w-32 xl:w-full"
        aria-label={`${movie.title} — details`}
      >
        <Poster
          path={movie.posterPath}
          title={movie.title}
          sizes="(min-width: 1280px) 200px, 128px"
          priority={priority}
          className="transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <span
          aria-hidden="true"
          className="absolute top-2 left-2 flex size-8 items-center justify-center rounded-full bg-background/85 text-sm font-semibold text-accent ring-1 ring-white/10 backdrop-blur"
        >
          {rank}
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2 py-1 xl:px-1">
        <div>
          <h2 className="text-lg leading-snug font-semibold">
            <Link
              href={`/movie/${movie.id}`}
              scroll={false}
              className="rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              <span className="sr-only">Pick {rank}: </span>
              {movie.title}
            </Link>
          </h2>
          <MovieMeta year={movie.year} runtime={movie.runtime} rating={movie.rating} />
        </div>

        <p className="text-[0.95rem] leading-relaxed text-foreground/85 xl:line-clamp-5 xl:text-sm">
          {reason}
        </p>

        {actions ? <div className="mt-auto pt-1">{actions}</div> : null}
      </div>
    </article>
  );
}
