import { formatRating, formatRuntime } from "@/lib/movie-view";

/** "2018 · 2h 8m · ★ 7.3" — every value from TMDB, absent ones skipped. */
export function MovieMeta({
  year,
  runtime,
  rating,
  className = "",
}: {
  year: number | null;
  runtime: number | null;
  rating: number | null;
  className?: string;
}) {
  const parts = [year ? String(year) : null, formatRuntime(runtime)].filter(Boolean);
  const score = formatRating(rating);

  return (
    <p className={`flex flex-wrap items-center gap-x-2 text-sm text-muted ${className}`}>
      {parts.map((part, index) => (
        <span key={part} className="flex items-center gap-2">
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          {part}
        </span>
      ))}
      {score ? (
        <span className="flex items-center gap-1">
          {parts.length > 0 ? <span aria-hidden="true">·</span> : null}
          <span aria-hidden="true" className="text-accent">
            ★
          </span>
          <span>
            <span className="sr-only">Rated </span>
            {score}
            <span className="sr-only"> out of 10 on TMDB</span>
          </span>
        </span>
      ) : null}
    </p>
  );
}
