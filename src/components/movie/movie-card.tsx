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
  /** The #1 pick: spans the full row from `md:` and gets a bigger poster on desktop. */
  featured?: boolean;
};

/**
 * One ranked pick. Always horizontal — poster left, reason right — because the
 * reason is the point of the app and deserves the room, never a clamp. On
 * desktop the poster and type scale up instead of the card going vertical.
 */
export function MovieCard({ rank, reason, movie, actions, priority, featured }: MovieCardProps) {
  return (
    <article
      className={`group flex h-full gap-4 rounded-3xl bg-surface p-3 ring-1 ring-white/5 lg:p-4 ${featured ? "lg:gap-6" : "lg:gap-5"}`}
    >
      <Link
        href={`/movie/${movie.id}`}
        scroll={false}
        className={`relative w-28 shrink-0 rounded-xl focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none sm:w-32 ${featured ? "lg:w-52" : "lg:w-36"}`}
        aria-label={`${movie.title} — details`}
      >
        <Poster
          path={movie.posterPath}
          title={movie.title}
          sizes={featured ? "(min-width: 1024px) 208px, 128px" : "(min-width: 1024px) 144px, 128px"}
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

      <div className="flex min-w-0 flex-1 flex-col gap-2 py-1 lg:gap-3">
        <div>
          <h2 className={`text-lg leading-snug font-semibold ${featured ? "lg:text-2xl" : "lg:text-xl"}`}>
            <Link
              href={`/movie/${movie.id}`}
              scroll={false}
              className="rounded hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              <span className="sr-only">Pick {rank}: </span>
              {movie.title}
            </Link>
          </h2>
          <MovieMeta year={movie.year} runtime={movie.runtime} rating={movie.rating} />
        </div>

        <p
          className={`text-[0.95rem] leading-relaxed text-foreground/85 ${featured ? "lg:max-w-2xl lg:text-lg" : "lg:text-base"}`}
        >
          {reason}
        </p>

        {actions ? <div className="mt-auto pt-1">{actions}</div> : null}
      </div>
    </article>
  );
}
