import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RegenerateButton } from "@/components/movie/regenerate-button";
import { ResultsList } from "@/components/movie/results-list";
import { readAnonSessionIds } from "@/lib/anon-cookie";
import { getViewerMovieStates } from "@/lib/feedback";
import { getResultsSession } from "@/lib/sessions";
import { getUserId } from "@/lib/viewer";

type Params = { params: Promise<{ sessionId: string }> };

export const metadata: Metadata = { title: "Your five · Movie Recs" };

/** Pure DB read — revisiting a session never recomputes it (FEATURES F-06). */
export default async function ResultsPage({ params }: Params) {
  const { sessionId } = await params;
  const session = await getResultsSession(sessionId);
  if (!session) notFound();

  const userId = await getUserId();
  // Swapping rewrites the session, so only its owner (or the anonymous
  // browser that created it) gets the ✕-to-swap behaviour.
  const canSwap = session.userId
    ? session.userId === userId
    : (await readAnonSessionIds()).includes(session.id);
  const states = await getViewerMovieStates(
    userId,
    session.picks.map((pick) => pick.movie.id),
  );

  const answers = session.answers;
  // Surprise sessions carry a synthetic step; the eyebrow already says so.
  const chips = answers?.byStep.surprise ? [] : (answers?.steps.map((step) => step.label) ?? []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-6 pb-8 md:max-w-3xl md:px-6 md:pt-10 xl:max-w-6xl">
      <header className="space-y-3 px-2">
        <p className="text-sm tracking-[0.2em] text-accent uppercase">
          {session.type === "FOR_YOU"
            ? "For you"
            : answers?.byStep.surprise
              ? "Surprise picks"
              : "Your five for tonight"}
        </p>
        {chips.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Your picks">
            {chips.map((chip) => (
              <li key={chip} className="rounded-full bg-surface px-3 py-1 text-sm ring-1 ring-white/10">
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
        {answers?.note ? (
          <p className="text-sm text-muted">
            <span className="text-foreground/70">You said:</span> “{answers.note}”
          </p>
        ) : null}
        {answers?.source === "fallback" ? (
          <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-white/5">
            Our curator was offline, so these are top-rated matches straight from TMDB.
          </p>
        ) : null}
      </header>

      <ResultsList
        sessionId={session.id}
        signedIn={userId !== null}
        canSwap={canSwap}
        picks={session.picks.map((pick) => ({
          ...pick,
          state: states[pick.movie.id] ?? { saved: false, signal: null },
        }))}
      />

      <footer className="mt-2 flex flex-col gap-3 px-2 sm:flex-row sm:justify-center">
        {/* For You batches have their own Refresh (with its cooldown) on /for-you. */}
        {canSwap && session.type !== "FOR_YOU" ? <RegenerateButton sessionId={session.id} /> : null}
        <Link
          href="/discover"
          className="min-h-tap flex items-center justify-center rounded-2xl bg-accent px-6 py-3 text-base font-semibold text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          Try another mood
        </Link>
      </footer>
    </main>
  );
}
