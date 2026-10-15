"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { postFeedback } from "./post-feedback";

/** Watchlist toggle with optimistic UI; logged-out taps go to sign-in. */
export function SaveButton({
  movieId,
  initialSaved,
  signedIn,
  variant = "pill",
}: {
  movieId: number;
  initialSaved: boolean;
  signedIn: boolean;
  variant?: "pill" | "icon";
}) {
  const pathname = usePathname();
  const [saved, setSaved] = useState(initialSaved);

  const label = saved ? "Saved" : "Save";
  const icon = (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h12v18l-6-4-6 4V3z" strokeLinejoin="round" />
    </svg>
  );
  const className = `min-h-tap inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
    variant === "icon" ? "min-w-tap" : "px-4"
  } ${saved ? "bg-accent text-accent-foreground" : "bg-white/5 text-foreground hover:bg-white/10"}`;

  if (!signedIn) {
    return (
      <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`} className={className} aria-label="Sign in to save">
        {icon}
        {variant === "pill" ? "Save" : null}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={variant === "icon" ? (saved ? "Remove from watchlist" : "Save to watchlist") : undefined}
      className={className}
      onClick={async () => {
        const next = !saved;
        setSaved(next); // optimistic
        if (!(await postFeedback({ movieId, signal: "SAVED", on: next }))) setSaved(!next);
      }}
    >
      {icon}
      {variant === "pill" ? label : null}
    </button>
  );
}
