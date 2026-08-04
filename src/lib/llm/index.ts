import { ZodError } from "zod";

import { env } from "@/lib/env";
import {
  Candidate,
  RecBatch,
  RecSingle,
  TASTE_SUMMARY_JSON_SCHEMA,
  TasteSummary,
  candidateListJsonSchema,
} from "@/lib/schemas";

import type { LlmPrompt, LlmProvider, LlmRequest } from "./types";
import { LlmError } from "./types";

/**
 * The app's only door to an LLM (CLAUDE.md rule 4). Callers hand in a prompt
 * built from docs/PROMPTS.md and get back validated data — never raw text, and
 * never anything that reaches the UI unchecked.
 *
 * Provider is chosen by `LLM_PROVIDER`; swapping it is the whole point of the
 * abstraction, so nothing above this file may import a vendor SDK.
 */

/** Ceiling for every call in the app (CLAUDE.md rule 4). */
const MAX_TOKENS = 600;

/**
 * Used when `LLM_MODEL` is unset, so flipping `LLM_PROVIDER` alone gives a
 * working configuration — a model id is provider-specific and a stale one from
 * the previous provider would just 404.
 */
const DEFAULT_MODELS = {
  gemini: "gemini-3.6-flash",
  anthropic: "claude-opus-5",
  openai: "gpt-5.6",
} as const;

/** Appended verbatim from docs/PROMPTS.md on the single retry. */
const RETRY_REINFORCEMENT =
  "Your previous output was invalid. Output ONLY the JSON array, nothing else.";

/** Rough family check, only ever used to warn — see `warnOnModelMismatch`. */
const MODEL_PREFIXES: Record<keyof typeof DEFAULT_MODELS, string> = {
  gemini: "gemini",
  anthropic: "claude",
  openai: "gpt",
};

/**
 * A `LLM_MODEL` left over from the previous provider is the likeliest way a
 * provider swap goes wrong, and it surfaces as an opaque 404 from the vendor.
 * Warn rather than throw — the check is a naming heuristic, and it must not
 * block a legitimately unusual model id.
 */
function warnOnModelMismatch(provider: keyof typeof DEFAULT_MODELS, model: string): void {
  if (!model.startsWith(MODEL_PREFIXES[provider])) {
    console.warn(
      `[llm] LLM_MODEL="${model}" does not look like a ${provider} model. ` +
        `Unset LLM_MODEL to use ${DEFAULT_MODELS[provider]}.`,
    );
  }
}

let providerPromise: Promise<LlmProvider> | undefined;

/**
 * Providers are imported lazily so a deployment only ever loads the SDK it
 * actually uses, and memoized so clients (and their connection pools) are
 * shared across requests.
 */
function getProvider(): Promise<LlmProvider> {
  providerPromise ??= (async (): Promise<LlmProvider> => {
    const provider = env.LLM_PROVIDER;
    const model = env.LLM_MODEL ?? DEFAULT_MODELS[provider];
    warnOnModelMismatch(provider, model);

    switch (provider) {
      case "gemini":
        return (await import("./gemini")).createGeminiProvider(model);
      case "anthropic":
        return (await import("./anthropic")).createAnthropicProvider(model);
      case "openai":
        return (await import("./openai")).createOpenAiProvider(model);
    }
  })();

  return providerPromise;
}

/** Tolerates a model that wraps its JSON in a markdown fence despite the schema. */
function parseJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  return JSON.parse((fenced?.[1] ?? text).trim());
}

/**
 * Providers need an object at the schema root, so candidate lists travel as
 * `{ movies: [...] }` — but the prompt itself asks for a bare array, so accept
 * either rather than failing a response that followed the instructions.
 */
function unwrapCandidates(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (value !== null && typeof value === "object" && "movies" in value) {
    return (value as { movies: unknown }).movies;
  }
  return value;
}

function isMalformedOutput(error: unknown): boolean {
  return error instanceof SyntaxError || error instanceof ZodError;
}

/**
 * One call, one reinforced retry if the output doesn't parse or validate, then
 * give up (SPEC §3, docs/PROMPTS.md). Transport failures are not retried here —
 * the vendor SDKs already retry 429s and 5xxs internally, and a second full
 * prompt on a hard failure only doubles the latency the user is waiting on.
 */
async function completeJson<T>(
  prompt: LlmPrompt,
  schema: LlmRequest["schema"],
  validate: (value: unknown) => T,
): Promise<T> {
  const provider = await getProvider();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const user = attempt === 0 ? prompt.user : `${prompt.user}\n\n${RETRY_REINFORCEMENT}`;

    let text: string;
    try {
      text = await provider.complete({
        system: prompt.system,
        user,
        schema,
        maxTokens: MAX_TOKENS,
      });
    } catch (error) {
      if (error instanceof LlmError) throw error;
      throw new LlmError(`${provider.id} request failed`, { provider: provider.id, cause: error });
    }

    try {
      return validate(parseJson(text));
    } catch (error) {
      if (isMalformedOutput(error) && attempt === 0) continue;
      throw new LlmError(`${provider.id} returned output that failed validation`, {
        provider: provider.id,
        cause: error,
      });
    }
  }

  // Unreachable: the loop either returns or throws on the second attempt.
  throw new LlmError("LLM retry loop exhausted", { provider: provider.id });
}

/**
 * Five validated candidates for a wizard run or a For You batch (Templates A
 * and B). The prompt — including the exclusion list — is built by the caller.
 */
export async function getCandidates(prompt: LlmPrompt): Promise<Candidate[]> {
  return completeJson(prompt, candidateListJsonSchema(5), (value) =>
    RecBatch.parse(unwrapCandidates(value)),
  );
}

/** One replacement candidate after a NOT_FOR_ME on a For You card (Template D). */
export async function getReplacementCandidate(prompt: LlmPrompt): Promise<Candidate> {
  const candidates = await completeJson(prompt, candidateListJsonSchema(1), (value) =>
    RecSingle.parse(unwrapCandidates(value)),
  );
  // `RecSingle` fixes the length at 1; this only narrows the type.
  const [candidate] = candidates;
  if (!candidate) {
    throw new LlmError("Replacement candidate missing after validation", {
      provider: (await getProvider()).id,
    });
  }
  return candidate;
}

/** Regenerated taste-profile paragraph (Template C). */
export async function getTasteSummary(prompt: LlmPrompt): Promise<string> {
  const { summary } = await completeJson(prompt, TASTE_SUMMARY_JSON_SCHEMA, (value) =>
    TasteSummary.parse(value),
  );
  return summary;
}

export { LlmError } from "./types";
export type { LlmPrompt } from "./types";
