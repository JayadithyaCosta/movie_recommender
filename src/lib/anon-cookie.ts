import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { env } from "@/lib/env";

/**
 * Anonymous users' RecSession ids, kept in an HMAC-signed cookie so they can
 * be claimed on first login (SPEC §3) and excluded from later runs (rule 6).
 * Signed, not encrypted: the ids are not secret, they just must not be forged
 * into claiming someone else's sessions.
 */

const COOKIE = "mr_sessions";
const MAX_IDS = 30;
const MAX_AGE_S = 60 * 60 * 24 * 90;

function sign(payload: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(payload).digest("base64url");
}

function encode(ids: readonly string[]): string {
  const payload = Buffer.from(JSON.stringify(ids)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(value: string | undefined): string[] {
  if (!value) return [];
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return [];

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return [];

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString());
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function readAnonSessionIds(): Promise<string[]> {
  return decode((await cookies()).get(COOKIE)?.value);
}

/** Route handlers / server actions only — Server Components can't set cookies. */
export async function rememberAnonSession(sessionId: string): Promise<void> {
  const ids = [sessionId, ...(await readAnonSessionIds()).filter((id) => id !== sessionId)];
  (await cookies()).set(COOKIE, encode(ids.slice(0, MAX_IDS)), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function clearAnonSessions(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
