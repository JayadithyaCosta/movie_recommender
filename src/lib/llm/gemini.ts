import { GoogleGenAI } from "@google/genai";

import { requireEnv } from "@/lib/env";

import type { LlmProvider, LlmRequest } from "./types";
import { LlmError } from "./types";

/**
 * Default provider — the only one of the three with a free API tier.
 *
 * Uses the Interactions API (`ai.interactions.create`), which is Google's
 * current surface and the only one the Gemini 3 models are documented against;
 * `generateContent` is the previous generation.
 *
 * Two Gemini 3 constraints shape this file:
 * - Sampling parameters (temperature/top_p/top_k) are gone, so the temperatures
 *   in docs/PROMPTS.md can't be honoured here.
 * - Thinking tokens count against `max_output_tokens`, and our budget is 600
 *   (CLAUDE.md rule 4), so thinking is pinned to "minimal" — without it a
 *   thinking model can spend the whole budget reasoning and return nothing.
 */

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });
  return client;
}

export function createGeminiProvider(model: string): LlmProvider {
  return {
    id: "gemini",
    model,
    async complete(request: LlmRequest): Promise<string> {
      const interaction = await getClient().interactions.create({
        model,
        system_instruction: request.system,
        input: request.user,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: request.schema,
        },
        generation_config: {
          max_output_tokens: request.maxTokens,
          thinking_level: "minimal",
        },
      });

      const text = interaction.output_text?.trim();
      if (!text) {
        throw new LlmError("Gemini returned no text output", { provider: "gemini" });
      }
      return text;
    },
  };
}
