import { after, NextResponse } from "next/server";

import { STEP_TREE } from "@/config/steps";
import { rememberAnonSession } from "@/lib/anon-cookie";
import {
  CooldownError,
  recommendForYou,
  recommendWizard,
  RecommendUnavailableError,
  type RecommendResult,
} from "@/lib/recommend";
import { RecommendBody } from "@/lib/schemas";
import { maybeRegenerateTaste } from "@/lib/taste";
import { getViewer } from "@/lib/viewer";
import { buildAnswers, isCompletePath } from "@/lib/wizard";

const badRequest = () => NextResponse.json({ error: "bad_request" }, { status: 400 });

/** Thin by design — the pipeline lives in `src/lib/recommend.ts`. */
export async function POST(request: Request) {
  const body = RecommendBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return badRequest();

  const viewer = await getViewer();
  const { userId } = viewer;
  // Lazy taste regen (SPEC §4.2) runs after the response, so it never adds
  // an LLM round-trip to the wait for picks.
  if (userId) after(() => maybeRegenerateTaste(userId).catch((e) => console.error("[taste]", e)));

  try {
    let result: RecommendResult;

    switch (body.data.mode) {
      case "WIZARD": {
        if (!isCompletePath(STEP_TREE, body.data.picks)) return badRequest();
        const answers = buildAnswers(STEP_TREE, body.data.picks, body.data.note);
        result = await recommendWizard(answers, viewer);
        break;
      }
      case "FOR_YOU": {
        if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
        result = await recommendForYou(userId);
        break;
      }
      default:
        return badRequest();
    }

    if (!userId) await rememberAnonSession(result.sessionId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CooldownError) {
      return NextResponse.json(
        {
          error: "cooldown",
          nextAt: error.nextAt.toISOString(),
          message: "Fresh picks unlock soon — or rate a few movies to unlock them now.",
        },
        { status: 429 },
      );
    }
    if (error instanceof RecommendUnavailableError) {
      console.error("[recommend] unavailable:", error.message);
    } else {
      console.error("[recommend] unexpected failure:", error);
    }
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
