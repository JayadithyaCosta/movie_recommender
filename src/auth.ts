import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";

import { claimAnonSessions } from "@/lib/claim";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Auth.js v5 (SPEC §6): Google sign-in, database sessions via the Prisma
 * adapter. Google switches on only when its credentials exist. In development
 * an email magic link is also offered, printed to the server log instead of
 * sent — so login (and the seeded demo user) works with zero external setup.
 */

const providers: Provider[] = [];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET }));
}

if (env.NODE_ENV !== "production") {
  providers.push({
    id: "email",
    type: "email",
    name: "Email",
    maxAge: 24 * 60 * 60,
    sendVerificationRequest: ({ identifier, url }) => {
      console.log(`
[auth] magic link for ${identifier}:
${url}
`);
    },
  });
}

/** What the login page offers; mirrors the providers actually configured. */
export const authProviders = {
  google: providers.some((provider) => (typeof provider === "function" ? false : provider.id === "google")),
  devEmail: providers.some((provider) => (typeof provider === "function" ? false : provider.id === "email")),
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
