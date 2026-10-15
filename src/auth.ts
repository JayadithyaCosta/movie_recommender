import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

import { claimAnonSessions } from "@/lib/claim";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Auth.js v5 (SPEC §6): Google + email magic link, database sessions via the
 * Prisma adapter. Each provider switches on only when its credentials exist,
 * and in development the magic link is printed to the server log when no
 * Resend key is set — so login is testable with zero external setup.
 */

const providers: Provider[] = [];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET }));
}

if (env.AUTH_RESEND_KEY) {
  providers.push(Resend({ apiKey: env.AUTH_RESEND_KEY, from: env.AUTH_EMAIL_FROM }));
} else if (env.NODE_ENV !== "production") {
  providers.push(
    Resend({
      apiKey: "dev-console",
      from: env.AUTH_EMAIL_FROM,
      sendVerificationRequest: ({ identifier, url }) => {
        console.log(`\n[auth] magic link for ${identifier}:\n${url}\n`);
      },
    }),
  );
}

/** What the login page offers; mirrors the providers actually configured. */
export const authProviders = {
  google: providers.some((provider) => (typeof provider === "function" ? false : provider.id === "google")),
  email: providers.some((provider) => (typeof provider === "function" ? false : provider.id === "resend")),
  devEmail: !env.AUTH_RESEND_KEY && env.NODE_ENV !== "production",
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: env.AUTH_SECRET,
  session: { strategy: "database" },
  trustHost: true,
  providers,
  pages: {
    signIn: "/login",
    verifyRequest: "/login?sent=1",
    error: "/login",
  },
  events: {
    async signIn({ user }) {
      if (user.id) await claimAnonSessions(user.id);
    },
  },
});
