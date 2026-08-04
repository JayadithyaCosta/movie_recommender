import OpenAI from "openai";

import { requireEnv } from "@/lib/env";

import type { LlmProvider, LlmRequest } from "./types";
import { LlmError } from "./types";

/**
 * Paid swap path. Selected with `LLM_PROVIDER=openai`.
 *
 * Uses the Responses API (the current surface; Chat Completions is legacy) with
 * a strict `json_schema` format. Reasoning effort is "none" for the same reason
 * the other providers pin their thinking down: reasoning tokens are drawn from
 * `max_output_tokens`, and the app-wide budget is 600 (CLAUDE.md rule 4).
 */

let client: OpenAI | undefined;

function getClient(): OpenAI {
  client ??= new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  return client;
}

export function createOpenAiProvider(model: string): LlmProvider {
  return {
    id: "openai",
    model,
    async complete(request: LlmRequest): Promise<string> {
      const response = await getClient().responses.create({
        model,
        instructions: request.system,
        input: request.user,
        max_output_tokens: request.maxTokens,
        reasoning: { effort: "none" },
        text: {
          format: {
            type: "json_schema",
            name: "movie_recs",
            schema: request.schema,
            strict: true,
          },
        },
      });

      const text = response.output_text?.trim();
      if (!text) {
        throw new LlmError(`OpenAI returned no text output (status: ${response.status})`, {
          provider: "openai",
        });
      }
      return text;
    },
  };
}
