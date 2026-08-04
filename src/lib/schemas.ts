import { z } from "zod";

/**
 * Validation for everything that crosses a trust boundary — LLM output today,
 * TMDB responses and API bodies as F-04/F-05 land (CLAUDE.md conventions).
 *
 * Each LLM shape is declared twice on purpose: once as a zod schema (what we
 * validate against) and once as a JSON Schema (what we hand the provider so it
 * constrains generation). They must be kept in step; the zod side is the one
 * that decides whether a response is usable.
 */

/**
 * A single LLM-proposed film. This is the ONLY thing the LLM is trusted for
 * (CLAUDE.md rule 1) — `title` and `year` are lookup keys for TMDB, `reason` is
 * the one piece of prose we render, and nothing else it says is ever displayed.
 */
export const Candidate = z.object({
  title: z.string().min(1).max(120),
  year: z
    .number()
    .int()
    .gte(1900)
    .lte(new Date().getFullYear() + 1),
  reason: z.string().min(1).max(200),
});

export type Candidate = z.infer<typeof Candidate>;

export const RecBatch = z.array(Candidate).length(5);
export const RecSingle = z.array(Candidate).length(1);
export const TasteSummary = z.object({ summary: z.string().min(20).max(600) });

export type TasteSummary = z.infer<typeof TasteSummary>;

/**
 * Providers constrain output against a JSON Schema whose root must be an object
 * (Gemini, Anthropic and OpenAI all reject a bare array root in strict mode),
 * so the candidate list travels wrapped. `lib/llm` unwraps it before validating,
 * and also accepts a bare array so a provider that ignores the schema and
 * follows the prompt literally (docs/PROMPTS.md asks for an array) still parses.
 */
export const CandidateEnvelope = z.object({ movies: z.array(Candidate) });

/** JSON Schema for exactly `count` candidates. */
export function candidateListJsonSchema(count: number): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      movies: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            year: { type: "integer" },
            reason: { type: "string" },
          },
          required: ["title", "year", "reason"],
          additionalProperties: false,
        },
      },
    },
    required: ["movies"],
    additionalProperties: false,
  };
}

export const TASTE_SUMMARY_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: { summary: { type: "string" } },
  required: ["summary"],
  additionalProperties: false,
};
