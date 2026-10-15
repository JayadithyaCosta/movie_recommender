/**
 * Runs the wizard pipeline once, outside the web app, and prints the picks.
 * `make rec-smoke` exercises the LLM path; `LLM_MODEL=gemini-nope make rec-smoke`
 * proves the TMDB-only fallback still yields five verified films (SPEC §7).
 */

import { STEP_TREE } from "../src/config/steps";
import { db } from "../src/lib/db";
import { recommendWizard } from "../src/lib/recommend";
import { buildAnswers } from "../src/lib/wizard";

async function main(): Promise<void> {
  const answers = buildAnswers(
    STEP_TREE,
    [
      { stepId: "genre", optionId: "scifi" },
      { stepId: "era", optionId: "90s-00s" },
      { stepId: "pacing", optionId: "intense" },
    ],
    // A note keeps this run off the shared cache, so the pipeline really runs.
    "smoke test",
  );

  const { sessionId, source } = await recommendWizard(answers, { userId: null, anonSessionIds: [] });
  const recs = await db.recommendation.findMany({
    where: { sessionId },
    orderBy: { rank: "asc" },
    include: { movie: true },
  });

  console.log(`session ${sessionId} via ${source}:`);
  for (const rec of recs) {
    console.log(`  ${rec.rank}. ${rec.movie.title} (${rec.movie.year}) ★${rec.movie.rating} — ${rec.reason}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
