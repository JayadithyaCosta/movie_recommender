import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth, authProviders, signIn } from "@/auth";

export const metadata: Metadata = { title: "Sign in · Movie Recs" };

type Search = { searchParams: Promise<{ sent?: string; error?: string; callbackUrl?: string }> };

/** Only same-site paths — never bounce a user to an arbitrary URL after login. */
function safeCallback(url: string | undefined): string {
  return url && url.startsWith("/") && !url.startsWith("//") ? url : "/profile";
}

const ERRORS: Record<string, string> = {
  Verification: "That link has expired or was already used. Send yourself a fresh one.",
  default: "Something went wrong signing you in. Try again.",
};

export default async function LoginPage({ searchParams }: Search) {
  const params = await searchParams;
  const callbackUrl = safeCallback(params.callbackUrl);
  if ((await auth())?.user) redirect(callbackUrl);

  async function withEmail(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return;
    await signIn("resend", { email, redirectTo: callbackUrl });
  }

  async function withGoogle() {
    "use server";
    await signIn("google", { redirectTo: callbackUrl });
  }

  if (params.sent) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-10 text-center">
        <span aria-hidden="true" className="text-6xl">
          📬
        </span>
        <h1 className="text-3xl font-semibold">Check your inbox</h1>
        <p className="text-base text-muted">
          We sent you a sign-in link. Open it on this device and you&apos;re in.
        </p>
        {authProviders.devEmail ? (
          <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-white/5">
            Dev mode: no email is sent — the link is printed in the server log.
          </p>
        ) : null}
      </main>
    );
  }

  const error = params.error ? (ERRORS[params.error] ?? ERRORS.default) : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-10">
      <div className="space-y-3">
        <p className="text-sm tracking-[0.2em] text-accent uppercase">Movie Recs</p>
        <h1 className="text-3xl leading-tight font-semibold text-balance">
          Save picks. Get a feed that learns your taste.
        </h1>
        <p className="text-base text-muted">
          Signing in keeps your history, your watchlist and a For You feed that gets sharper with
          every ❤️ and ✕.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-500/20">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {authProviders.google ? (
          <form action={withGoogle}>
            <button
              type="submit"
              className="min-h-tap flex w-full items-center justify-center gap-3 rounded-2xl bg-foreground px-6 py-4 text-base font-semibold text-background focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
                <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z" />
                <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
              </svg>
              Continue with Google
            </button>
          </form>
        ) : null}

        {authProviders.google && authProviders.email ? (
          <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>
        ) : null}

        {authProviders.email ? (
          <form action={withEmail} className="flex flex-col gap-3">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              className="min-h-tap w-full rounded-2xl bg-surface px-5 py-4 text-base ring-1 ring-white/10 placeholder:text-muted/60 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            />
            <button
              type="submit"
              className="min-h-tap w-full rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              Email me a sign-in link
            </button>
          </form>
        ) : null}

        {!authProviders.google && !authProviders.email ? (
          <p className="text-sm text-muted">Sign-in isn&apos;t configured on this server yet.</p>
        ) : null}
      </div>

      <p className="text-center text-xs text-muted">No password. No spam. Just movies.</p>
    </main>
  );
}
