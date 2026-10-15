import { clearAnonSessions, readAnonSessionIds } from "@/lib/anon-cookie";
import { db } from "@/lib/db";

/**
 * On login, adopt the sessions this browser ran while anonymous (SPEC §3), so
 * the pre-signup wizard run shows up in the user's history. Only sessions that
 * are still unowned move — a signed cookie can't be used to take someone
 * else's.
 */
export async function claimAnonSessions(userId: string): Promise<number> {
  const ids = await readAnonSessionIds();
  if (ids.length === 0) return 0;

  const { count } = await db.recSession.updateMany({
    where: { id: { in: ids }, userId: null },
    data: { userId },
  });
  await clearAnonSessions();
  console.log(`[auth] claimed ${count} anonymous session(s) for ${userId}`);
  return count;
}
