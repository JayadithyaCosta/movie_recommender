/**
 * Live check that the configured provider returns validated candidates.
 *
 * Run with `make llm-smoke` (optionally `LLM_PROVIDER=anthropic make llm-smoke`)
 * — flipping that one variable is F-03's acceptance criterion, and this is the
 * cheapest way to prove it against the real API.
 *
 * The prompt below is Template A from docs/PROMPTS.md with a fixed sample path.
 * F-05 owns the real prompt builder; this stays a throwaway harness.
 */

import { env } from "../src/lib/env";
import { getCandidates } from "../src/lib/llm";

const SYSTEM = `You are a film curator. You recommend exactly 5 movies as JSON and nothing else.
Rules:
- Output format: [{"title": string, "year": number, "reason": string}] — exactly 5 items, valid JSON, no markdown, no prose.
- Use only real, released films. Prefer well-regarded picks; include exactly one lesser-known gem.
- "reason" is one sentence (max 22 words), personalized to the stated preferences — never a generic plot summary.
- Never recommend any title in the EXCLUDE list.
- Respect era and pacing preferences strictly.`;

const USER = `Tonight's preferences: Horror > Demons & possession > Modern (2010+) > Slow-burn

EXCLUDE: The Exorcist, Hereditary`;

async function main(): Promise<void> {
  console.log(`provider: ${env.LLM_PROVIDER}, model: ${env.LLM_MODEL ?? "(provider default)"}`);

  const started = Date.now();
  const candidates = await getCandidates({ system: SYSTEM, user: USER });

  console.log(`${candidates.length} validated candidates in ${Date.now() - started}ms:`);
  for (const candidate of candidates) {
    console.log(`  ${candidate.title} (${candidate.year}) — ${candidate.reason}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
