import { readAnonSessionIds } from "@/lib/anon-cookie";
import type { Viewer } from "@/lib/recommend";

/**
 * Who is asking. F-07 resolves `userId` from the Auth.js session; until then
 * everyone is anonymous and tracked by the signed cookie.
 */
export async function getViewer(): Promise<Viewer> {
  return { userId: null, anonSessionIds: await readAnonSessionIds() };
}
