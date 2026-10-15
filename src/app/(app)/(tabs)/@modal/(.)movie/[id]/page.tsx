import { notFound } from "next/navigation";

import { MovieDetail } from "@/components/movie/movie-detail";
import { Sheet } from "@/components/ui/sheet";
import { loadMovieDetail } from "@/lib/movie-detail";

type Params = { params: Promise<{ id: string }> };

/** In-app taps on a card land here: the detail opens over the results. */
export default async function MovieSheet({ params }: Params) {
  const detail = await loadMovieDetail(Number((await params).id));
  if (!detail) notFound();

  return (
    <Sheet label={detail.movie.title}>
      <MovieDetail {...detail} />
    </Sheet>
  );
}
