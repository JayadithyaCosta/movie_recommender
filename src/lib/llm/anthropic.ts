import Anthropic from "@anthropic-ai/sdk";

import { requireEnv } from "@/lib/env";

import type { LlmProvider, LlmRequest } from "./types";
import { LlmError } from "./types";

/**
 * Paid swap path. Selected with `LLM_PROVIDER=anthropic`.
 *
 * Thinking is switched off rather than left on its default: `max_tokens` caps
 * thinking *and* response text together, and our budget is 600 (CLAUDE.md rule
 * 4) — enough for five short recommendations, not enough to also reason. The
 * documented risk of running with thinking disabled is stray internal XML in
 * the visible output, which the system-prompt line below addresses; the other
 * known failure (tool calls emitted as plain text) can't apply here because
 * this call declares no tools.
 *
 * Sampling parameters are rejected by current models, so the temperatures in
 * docs/PROMPTS.md aren't honoured here either.
 */

const NO_INTERNAL_TAGS = "Do not include internal or system XML tags in your response.";

let client: Anthropic | undefined;

function getClient(): Anthropic {
  client ??= new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
  return client;
}

export function createAnthropicProvider(model: string): LlmProvider {
  return {
    id: "anthropic",
    model,
    async complete(request: LlmRequest): Promise<string> {
      const message = await getClient().messages.create({
        model,
        max_tokens: request.maxTokens,
        // Marked for caching so it applies once prompts grow past the cache
        // minimum; today's blocks are shorter than that and simply won't cache.
        system: [
          {
            type: "text",
            text: `${request.system}\n${NO_INTERNAL_TAGS}`,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: request.user }],
        thinking: { type: "disabled" },
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: request.schema },
        },
      });

      const text = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();

      if (!text) {
        throw new LlmError(`Anthropic returned no text (stop_reason: ${message.stop_reason})`, {
          provider: "anthropic",
        });
      }
      return text;
    },
  };
}
