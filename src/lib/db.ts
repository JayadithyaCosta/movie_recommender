import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";

/**
 * A single PrismaClient for the process. In dev, Next's HMR re-evaluates modules
 * on every edit, so the client is stashed on globalThis to avoid exhausting the
 * Postgres connection pool with a new client per reload.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
