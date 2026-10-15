"use client";

import type { Signal } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { postFeedback } from "./post-feedback";

type RatingSignal = Exclude<Signal, "SAVED">;

type FeedbackBarProps = {
  movieId: number;
  title: string;
  initialSignal: Signal | null;
  initialSaved: boolean;
  signedIn: boolean;
  /**
   * Called after ✕. Results and For You use it to swap the card in place; it
   * runs for anonymous viewers too (the swap needs no account, only storing
   * the signal does).
   */
  onNotForMe?: () => void;
};

const ICONS: Record<RatingSignal | "SAVE", (active: boolean) => React.ReactNode> = {
  LOVED: (active) => (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" strokeLinejoin="round" />
    </svg>
  ),
  SEEN: (active) => (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" fill={active ? "currentColor" : "none"} />
    </svg>
  ),
  NOT_FOR_ME: () => (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ),
  SAVE: (active) => (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h12v18l-6-4-6 4V3z" strokeLinejoin="round" />
    </svg>
  ),
};

const ACTIONS: { signal: RatingSignal; label: string; activeLabel: string; activeClass: string }[] = [
  { signal: "LOVED", label: "Love", activeLabel: "Loved", activeClass: "bg-rose-500/20 text-rose-300 ring-rose-400/40" },
  { signal: "SEEN", label: "Seen", activeLabel: "Seen", activeClass: "bg-sky-500/20 text-sky-200 ring-sky-400/40" },
  { signal: "NOT_FOR_ME", label: "Nope", activeLabel: "Nope", activeClass: "bg-white/15 text-foreground ring-white/30" },
];

const BASE =
  "min-h-tap flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";
const IDLE = "bg-white/5 text-muted ring-transparent hover:bg-white/10 hover:text-foreground";

/**
 * ❤️ Love · 👁 Seen · ✕ Nope · 🔖 Save (SPEC §4.1). One rating per movie —
 * tapping the active one clears it. Optimistic, rolled back on failure.
 */
export function FeedbackBar({
  movieId,
  title,
  initialSignal,
  initialSaved,
  signedIn,
  onNotForMe,
}: FeedbackBarProps) {
  const pathname = usePathname();
  const [signal, setSignal] = useState<Signal | null>(initialSignal);
  const [saved, setSaved] = useState(initialSaved);
  const loginHref = `/login?callbackUrl=${encodeURIComponent(pathname)}`;

  async function rate(next: RatingSignal) {
    const on = signal !== next;
    const previous = signal;
    if (on && next === "NOT_FOR_ME") onNotForMe?.();
    if (!signedIn) return;

    setSignal(on ? next : null);
    if (!(await postFeedback({ movieId, signal: next, on }))) setSignal(previous);
  }

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    if (!(await postFeedback({ movieId, signal: "SAVED", on: next }))) setSaved(!next);
  }

  return (
    <div role="group" aria-label={`Rate ${title}`} className="grid grid-cols-4 gap-1.5">
      {ACTIONS.map((action) => {
        const active = signal === action.signal;
        const requiresLogin = !signedIn && !(action.signal === "NOT_FOR_ME" && onNotForMe);
        const content = (
          <>
            {ICONS[action.signal](active)}
            {active ? action.activeLabel : action.label}
          </>
        );
        return requiresLogin ? (
          <Link key={action.signal} href={loginHref} className={`${BASE} ${IDLE}`} aria-label={`${action.label} — sign in to rate`}>
            {content}
          </Link>
        ) : (
          <button
            key={action.signal}
            type="button"
            aria-pressed={active}
            onClick={() => void rate(action.signal)}
            className={`${BASE} ${active ? action.activeClass : IDLE}`}
          >
            {content}
          </button>
        );
      })}
      {signedIn ? (
        <button
          type="button"
          aria-pressed={saved}
          onClick={() => void toggleSave()}
          className={`${BASE} ${saved ? "bg-accent/20 text-accent ring-accent/40" : IDLE}`}
        >
          {ICONS.SAVE(saved)}
          {saved ? "Saved" : "Save"}
        </button>
      ) : (
        <Link href={loginHref} className={`${BASE} ${IDLE}`} aria-label="Save — sign in to keep a watchlist">
          {ICONS.SAVE(false)}
          Save
        </Link>
      )}
    </div>
  );
}
