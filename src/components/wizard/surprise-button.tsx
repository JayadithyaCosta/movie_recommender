"use client";

import { ErrorPanel } from "@/components/ui/error-panel";

import { Curating } from "./curating";
import { useRecommend } from "./use-recommend";

/** Zero-question path to five picks (F-14). */
export function SurpriseButton() {
  const { status, submit, reset } = useRecommend();
  const go = () => void submit({ mode: "SURPRISE" });

  if (status.state === "loading" || status.state === "error") {
    return (
      <div className="fixed inset-0 z-50 flex bg-background px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          {status.state === "loading" ? (
            <Curating label="Rolling the dice" />
          ) : (
            <ErrorPanel onRetry={go} secondary={{ label: "Back", onClick: reset }} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={go}
        className="min-h-tap flex w-full items-center justify-center gap-2 rounded-2xl bg-surface px-6 py-4 text-base font-semibold ring-1 ring-white/10 transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none active:scale-[0.98]"
      >
        <span aria-hidden="true">🎲</span> Surprise me
      </button>
      {status.state === "rate_limited" ? (
        <p role="alert" className="text-center text-sm text-muted">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
