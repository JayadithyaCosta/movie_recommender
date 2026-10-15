"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Curating } from "@/components/wizard/curating";

const FALLBACK_MESSAGE = "Our film curator is napping — give it another go in a moment.";

/**
 * "None of these" (F-15): reruns this session's brief as a new session with
 * the current five excluded, then lands on the fresh results page.
 */
export function RegenerateButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function regenerate() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "AGAIN", sessionId }),
      });
      const data = (await response.json().catch(() => ({}))) as { sessionId?: string; message?: string };
      if (!response.ok || !data.sessionId) {
        setMessage(data.message ?? FALLBACK_MESSAGE);
        setLoading(false);
        return;
      }
      // Stays on the overlay until the new page replaces this one.
      router.push(`/results/${data.sessionId}`);
    } catch {
      setMessage(FALLBACK_MESSAGE);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex bg-background/95 px-6 backdrop-blur">
        <Curating label="Finding five new picks" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => void regenerate()}
        className="min-h-tap inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-surface px-6 py-3 text-base font-medium text-foreground ring-1 ring-white/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none sm:w-auto"
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        None of these? Get 5 new
      </button>
      {message ? (
        <p role="alert" className="text-center text-sm text-muted">
          {message}
        </p>
      ) : null}
    </div>
  );
}
