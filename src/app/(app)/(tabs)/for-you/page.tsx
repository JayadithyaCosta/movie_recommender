import type { Metadata } from "next";
import Link from "next/link";

import { ForYouRefresh } from "@/components/movie/for-you-refresh";
import { ResultsList } from "@/components/movie/results-list";
import { PAGE } from "@/components/ui/page";
import { getViewerMovieStates } from "@/lib/feedback";
import { forYouRefreshGate } from "@/lib/recommend";
import { getLatestForYou, hasTasteHistory } from "@/lib/sessions";
import { getTaste } from "@/lib/taste";
import { getUserId } from "@/lib/viewer";

export const metadata: Metadata = { title: "For You · Movie Recs" };

/** Page views are DB reads only; the LLM runs only on an explicit refresh. */
export default async function ForYouPage() {
  const userId = await getUserId();
  if (!userId) return <SignedOut />;

  const [batch, gate, taste] = await Promise.all([
    getLatestForYou(userId),
    forYouRefreshGate(userId),
    getTaste(userId),
  ]);
  const lockedUntil = gate.allowed ? null : gate.nextAt.toISOString();

  if (!batch) {
    const ready = await hasTasteHistory(userId);
    return (
      <main className={PAGE}>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <span aria-hidden="true" className="text-6xl">
            ✨
          </span>
          {ready ? (
            <>
              <h1 className="text-3xl font-semibold text-balance">Your feed is ready to build</h1>
              <p className="max-w-sm text-base text-muted">
                Five picks from everything you&apos;ve told us so far — and it gets sharper every
                time you rate one.
              </p>
              <div className="w-full max-w-sm">
                <ForYouRefresh lockedUntil={null} label="Build my picks" variant="primary" />
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-semibold text-balance">We don&apos;t know you yet</h1>
              <p className="max-w-sm text-base text-muted">
                Tell us what you feel like tonight and we&apos;ll learn from there.
              </p>
              <Link
                href="/discover"
                className="min-h-tap flex w-full max-w-sm items-center justify-center rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-accent-foreground"
              >
                I feel like…
              </Link>
            </>
          )}
        </div>
      </main>
    );
  }

  const states = await getViewerMovieStates(
    userId,
    batch.picks.map((pick) => pick.movie.id),
  );

  return (
    <main className={PAGE}>
      <header className="flex flex-col gap-4 px-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm tracking-[0.2em] text-accent uppercase">For you</p>
          <h1 className="text-2xl font-semibold text-balance md:text-3xl">Picked from your taste</h1>
          {taste?.summary ? (
            <p className="line-clamp-2 max-w-2xl text-sm text-muted">{taste.summary}</p>
          ) : null}
          <p className="text-xs text-muted">Tap ✕ Nope on any card to swap just that one.</p>
        </div>
        <ForYouRefresh lockedUntil={lockedUntil} />
      </header>

      <ResultsList
        key={batch.id}
        sessionId={batch.id}
        signedIn
        canSwap
        picks={batch.picks.map((pick) => ({
          ...pick,
          state: states[pick.movie.id] ?? { saved: false, signal: null },
        }))}
      />
    </main>
  );
}

function SignedOut() {
  return (
    <main className={PAGE}>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <span aria-hidden="true" className="text-6xl">
          🍿
        </span>
        <h1 className="text-3xl font-semibold text-balance">A feed that learns your taste</h1>
        <p className="max-w-sm text-base text-muted">
          Sign in and every ❤️, 👁 and ✕ teaches us what you like. Your For You picks get better
          each time.
        </p>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Link
            href="/login?callbackUrl=/for-you"
            className="min-h-tap flex items-center justify-center rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-accent-foreground"
          >
            Sign in
          </Link>
          <Link href="/discover" className="min-h-tap flex items-center justify-center text-sm text-muted underline underline-offset-4">
            Or just pick a mood
          </Link>
        </div>
      </div>
    </main>
  );
}
