"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type { RecommendBody } from "@/lib/schemas";

export type RecommendStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error" }
  | { state: "rate_limited"; message: string };

/**
 * POSTs to `/api/recommend` and navigates to the results. The caller keeps its
 * own state (wizard answers), so a failure leaves everything in place for a
 * retry (SPEC §7).
 */
export function useRecommend() {
  const router = useRouter();
  const [status, setStatus] = useState<RecommendStatus>({ state: "idle" });

  const submit = useCallback(
    async (body: RecommendBody) => {
      setStatus({ state: "loading" });
      try {
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await response.json().catch(() => ({}))) as {
          sessionId?: string;
          message?: string;
        };

        if (response.status === 429) {
          setStatus({
            state: "rate_limited",
            message: data.message ?? "That's a lot of movie nights. Take a breather and try again soon.",
          });
          return;
        }
        if (!response.ok || !data.sessionId) {
          setStatus({ state: "error" });
          return;
        }
        // Stay in "loading" until the results route takes over the screen.
        router.push(`/results/${data.sessionId}`);
      } catch {
        setStatus({ state: "error" });
      }
    },
    [router],
  );

  const reset = useCallback(() => setStatus({ state: "idle" }), []);

  return { status, submit, reset };
}
