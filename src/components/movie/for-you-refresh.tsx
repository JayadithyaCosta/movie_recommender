"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Curating } from "@/components/wizard/curating";

type ForYouRefreshProps = {
  /** ISO time the cooldown lifts; null when a refresh is allowed now. */
  lockedUntil: string | null;
  label?: string;
  variant?: "primary" | "secondary";
};

function untilLabel(iso: string): string {
  const totalMinutes = Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * "Refresh picks" (SPEC §2.2). Locked for 12h after a batch, unless the user
 * has rated something since — then the lock lifts on the next render.
 */
export function ForYouRefresh({ lockedUntil, label = "Refresh picks", variant = "secondary" }: ForYouRefreshProps) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function refresh() {
    setState("loading");
    setMessage(null);
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "FOR_YOU" }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setState("error");
        setMessage(
          data.message ?? "Our film curator is napping — give it another go in a moment.",
        );
        return;
      }
      startTransition(() => router.refresh());
      setState("idle");
    } catch {
      setState("error");
      setMessage("Our film curator is napping — give it another go in a moment.");
    }
  }

  if (state === "loading") {
    return (
      <div className="fixed inset-0 z-40 flex bg-background/95 px-6 backdrop-blur">
        <Curating label="Building your picks" />
      </div>
    );
  }

  const locked = lockedUntil !== null;
  const styles =
    variant === "primary"
      ? "bg-accent text-accent-foreground px-6 py-4 text-base font-semibold w-full"
      : "bg-surface text-foreground ring-1 ring-white/10 px-5 text-sm font-medium";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={locked}
        className={`min-h-tap inline-flex items-center justify-center gap-2 rounded-2xl transition-opacity focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-50 ${styles}`}
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label}
      </button>
      {locked ? (
        <p className="text-xs text-muted">
          New picks in {untilLabel(lockedUntil)} — or rate a few movies to unlock them now.
        </p>
      ) : null}
      {message ? (
        <p role="alert" className="text-sm text-muted">
          {message}
        </p>
      ) : null}
    </div>
  );
}
