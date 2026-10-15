import { auth } from "@/auth";
import { readAnonSessionIds } from "@/lib/anon-cookie";
import type { Viewer } from "@/lib/recommend";

/**
 * Who is asking: the Auth.js user, or an anonymous browser tracked by the
 * signed session cookie (whose ids only matter while logged out).
 */
export async function getViewer(): Promise<Viewer> {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  return { userId, anonSessionIds: userId ? [] : await readAnonSessionIds() };
}

export async function getUserId(): Promise<string | null> {
  return (await auth())?.user?.id ?? null;
}
