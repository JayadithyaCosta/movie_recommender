import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MovieDetail } from "@/components/movie/movie-detail";
import { loadMovieDetail } from "@/lib/movie-detail";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const detail = await loadMovieDetail(Number((await params).id));
  return { title: detail ? `${detail.movie.title} · Movie Recs` : "Movie · Movie Recs" };
}

/** Direct-URL version of the detail sheet (shared links, refreshes). */
export default async function MoviePage({ params }: Params) {
  const detail = await loadMovieDetail(Number((await params).id));
  if (!detail) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl md:pt-6">
      <div className="overflow-hidden md:rounded-3xl md:ring-1 md:ring-white/5">
        <MovieDetail {...detail} />
      </div>
    </main>
  );
}
