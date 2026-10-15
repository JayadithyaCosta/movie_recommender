import { z } from "zod";

/**
 * The single place in the app that reads `process.env`. Import `env` from here
 * everywhere else — never touch `process.env` directly (CLAUDE.md conventions).
 *
 * Vars are tiered: what the app needs to boot today is required, and everything
 * a later feature owns stays optional until that feature lands. Each optional
 * var is annotated with the feature that will start depending on it, so the
 * moment it becomes load-bearing it should be promoted to required here.
 */

/** Treats "" the same as unset — .env.example ships placeholder empty strings. */
const optionalSecret = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const envSchema = z.object({
  // --- required now ---
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (see .env.example)"),
  /** Signs the anonymous-session cookie (F-05) and Auth.js sessions (F-07). */
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET is required — `openssl rand -base64 32`"),

  // --- defaulted ---
  /**
   * Defaults to Gemini: it is the only one of the three with a free API tier
   * (OpenAI has none; Anthropic has none). Anthropic/OpenAI stay selectable for
   * a paid swap — that is the whole point of the provider abstraction.
   */
  LLM_PROVIDER: z.enum(["gemini", "anthropic", "openai"]).default("gemini"),
  RATE_LIMIT_DISABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // --- optional until their owning feature lands ---
  /**
   * Left unset in most deployments: a model id is provider-specific, so
   * `src/lib/llm` falls back to that provider's default and flipping
   * LLM_PROVIDER alone stays a working configuration.
   */
  LLM_MODEL: optionalSecret, // F-03
  GEMINI_API_KEY: optionalSecret, // F-03 — required when LLM_PROVIDER=gemini
  ANTHROPIC_API_KEY: optionalSecret, // F-03
  OPENAI_API_KEY: optionalSecret, // F-03
  TMDB_READ_TOKEN: optionalSecret, // F-04
  AUTH_URL: optionalSecret, // F-07
  AUTH_GOOGLE_ID: optionalSecret, // F-07
  AUTH_GOOGLE_SECRET: optionalSecret, // F-07
  AUTH_RESEND_KEY: optionalSecret, // F-07
  REDIS_URL: optionalSecret, // optional forever — pathHash cache lives in Postgres by default
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Invalid environment configuration:\n${problems}\n\n` +
        `Copy .env.example to .env and fill in the missing values.`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();

/**
 * Narrow an optional var to a required one at the point of use, so a feature
 * that needs a key fails with a clear message instead of a downstream 401.
 */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value as NonNullable<Env[K]>;
}
