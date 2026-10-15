import { NextResponse } from "next/server";

import { setSaved, setSignal, UnknownMovieError } from "@/lib/feedback";
import { FeedbackBody } from "@/lib/schemas";
import { getUserId } from "@/lib/viewer";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = FeedbackBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    const { movieId, signal, on } = body.data;
    if (signal === "SAVED") await setSaved(userId, movieId, on);
    else await setSignal(userId, movieId, signal, on);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnknownMovieError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    console.error("[feedback] failed:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
