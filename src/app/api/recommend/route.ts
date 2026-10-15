import { after, NextResponse } from "next/server";

import { STEP_TREE } from "@/config/steps";
import { rememberAnonSession } from "@/lib/anon-cookie";
import { recommendWizard, RecommendUnavailableError } from "@/lib/recommend";
import { RecommendBody } from "@/lib/schemas";
import { maybeRegenerateTaste } from "@/lib/taste";
import { getViewer } from "@/lib/viewer";
import { buildAnswers, isCompletePath } from "@/lib/wizard";

/** Thin by design — the pipeline lives in `src/lib/recommend.ts`. */
export async function POST(request: Request) {
  const body = RecommendBody.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const viewer = await getViewer();
  const { userId } = viewer;
  // Lazy taste regen (SPEC §4.2) runs after the response, so it never adds
  // an LLM round-trip to the wait for picks.
  if (userId) after(() => maybeRegenerateTaste(userId).catch((e) => console.error("[taste]", e)));

  try {
    if (body.data.mode !== "WIZARD") {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    if (!isCompletePath(STEP_TREE, body.data.picks)) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const answers = buildAnswers(STEP_TREE, body.data.picks, body.data.note);
    const result = await recommendWizard(answers, viewer);

    if (!viewer.userId) await rememberAnonSession(result.sessionId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RecommendUnavailableError) {
      console.error("[recommend] unavailable:", error.message);
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    console.error("[recommend] unexpected failure:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
