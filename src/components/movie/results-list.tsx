"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { ViewerMovieState } from "@/lib/feedback";
import type { MovieView } from "@/lib/movie-view";

import { FeedbackBar } from "./feedback-bar";
import { MovieCard } from "./movie-card";

export type ListPick = {
  recId: string;
  rank: number;
  reason: string;
  movie: MovieView;
  state: ViewerMovieState;
};

type ResultsListProps = {
  sessionId: string;
  picks: ListPick[];
  signedIn: boolean;
  /** ✕ swaps the card in place (For You always; wizard results via F-14). */
  canSwap: boolean;
};

/**
 * The five ranked cards with their actions. ✕ ("Nope") replaces just that
 * card — the rest of the batch stays put (SPEC §4.1).
 */
export function ResultsList({ sessionId, picks: initial, signedIn, canSwap }: ResultsListProps) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const [picks, setPicks] = useState(initial);
  const [swapping, setSwapping] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const swap = useCallback(
    async (rank: number) => {
      setSwapping((current) => new Set(current).add(rank));
      try {
        const response = await fetch("/api/recommend/replace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, rank }),
        });
        if (response.status === 429) {
          const data = (await response.json().catch(() => ({}))) as { message?: string };
          setToast(data.message ?? "Easy there — try again in a bit.");
          return;
        }
        if (!response.ok) throw new Error(String(response.status));
        const next = (await response.json()) as ListPick;
        setPicks((current) => current.map((pick) => (pick.rank === rank ? next : pick)));
        setToast(`Swapped in ${next.movie.title}`);
        // Server bits around the list (e.g. the For You refresh lock) depend on
        // the new signal; the list itself keeps its client state.
        router.refresh();
      } catch {
        setToast("Couldn't find a replacement right now — try again in a moment.");
      } finally {
        setSwapping((current) => {
          const copy = new Set(current);
          copy.delete(rank);
          return copy;
        });
      }
    },
    [sessionId, router],
  );

  return (
    <>
      <ol className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-5">
        {picks.map((pick, index) => (
          <li key={pick.rank} className={`relative ${index === 0 ? "md:col-span-2 xl:col-span-1" : ""}`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pick.movie.id}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="h-full"
              >
                <MovieCard
                  rank={pick.rank}
                  reason={pick.reason}
                  movie={pick.movie}
                  priority={index < 2}
                  actions={
                    <FeedbackBar
                      movieId={pick.movie.id}
                      title={pick.movie.title}
                      initialSignal={pick.state.signal}
                      initialSaved={pick.state.saved}
                      signedIn={signedIn}
                      onNotForMe={canSwap ? () => void swap(pick.rank) : undefined}
                    />
                  }
                />
              </motion.div>
            </AnimatePresence>

            {swapping.has(pick.rank) ? (
              <div
                role="status"
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-background/80 backdrop-blur-sm"
              >
                <motion.span
                  aria-hidden="true"
                  className="block size-8 rounded-full border-2 border-accent border-t-transparent"
                  animate={reduceMotion ? undefined : { rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                />
                <span className="text-sm text-muted">Finding a better pick…</span>
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-8"
      >
        <AnimatePresence>
          {toast ? (
            <motion.p
              key={toast}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-xl"
            >
              {toast}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
