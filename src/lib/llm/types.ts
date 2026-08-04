/**
 * The contract every provider implements. Deliberately tiny: one JSON-only
 * completion, no streaming, no tools, no conversation state — the whole app
 * only ever asks the LLM for a small JSON document (CLAUDE.md rule 4).
 */

export type LlmPrompt = {
  /**
   * Static per template (docs/PROMPTS.md). Kept separate from `user` so it sits
   * at the front of the request, where provider prompt caching can pick it up.
   */
  system: string;
  user: string;
};

export type LlmRequest = LlmPrompt & {
  /** JSON Schema the provider constrains generation against. Object root. */
  schema: Record<string, unknown>;
  /** Hard ceiling on output tokens; ≤ 600 app-wide (CLAUDE.md rule 4). */
  maxTokens: number;
};

export type LlmProvider = {
  /** Matches `LLM_PROVIDER`; used in logs and error messages. */
  readonly id: "gemini" | "anthropic" | "openai";
  readonly model: string;
  /** Returns the raw response text. Parsing and validation happen in `index.ts`. */
  complete(request: LlmRequest): Promise<string>;
};

/**
 * Every failure the LLM layer can produce — transport, empty response, or
 * output that still didn't validate after the retry. Route handlers translate
 * this into the "our film curator is napping" screen (SPEC §7); the underlying
 * provider error is preserved in `cause` for logs but never shown to the user.
 */
export class LlmError extends Error {
  readonly provider: string;

  constructor(message: string, options: { provider: string; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = "LlmError";
    this.provider = options.provider;
  }
}
