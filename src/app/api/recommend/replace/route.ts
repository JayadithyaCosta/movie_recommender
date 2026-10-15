import { NextResponse } from "next/server";

import { getViewerMovieStates } from "@/lib/feedback";
import { toMovieView } from "@/lib/movie-view";
import { NotAllowedError, replacePick, RecommendUnavailableError } from "@/lib/recommend";
import { checkRateLimit } from "@/lib/rate-limit";
import { ReplaceBody } from "@/lib/schemas";
import { getViewer } from "@/lib/viewer";

/** ✕ Nope or 👁 Seen on a card → one fresh pick in that slot (Template D). */
export async function POST(request: Request) {
  const body = ReplaceBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const viewer = await getViewer();
  const limit = await checkRateLimit(viewer.userId);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: limit.message },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterS) } },
    );
  }

  try {
    const pick = await replacePick(body.data.sessionId, body.data.rank, viewer, body.data.why);
    const state = (await getViewerMovieStates(viewer.userId, [pick.movie.id]))[pick.movie.id];
    return NextResponse.json({
      recId: pick.recId,
      rank: pick.rank,
      reason: pick.reason,
      movie: toMovieView(pick.movie),
      state,
    });
  } catch (error) {
    if (error instanceof NotAllowedError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!(error instanceof RecommendUnavailableError)) console.error("[replace] failed:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
