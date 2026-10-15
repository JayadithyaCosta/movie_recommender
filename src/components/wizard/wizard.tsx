"use client";

import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect } from "react";

import { ErrorPanel } from "@/components/ui/error-panel";
import type { StepTree } from "@/lib/wizard";

import { Curating } from "./curating";
import { ProgressDots } from "./progress-dots";
import { StepCard } from "./step-card";
import { useRecommend } from "./use-recommend";
import { useWizard } from "./use-wizard";
import { WizardSummary } from "./wizard-summary";

type WizardProps = {
  tree: StepTree;
};

export function Wizard({ tree }: WizardProps) {
  const {
    state,
    step,
    picks,
    stepNumber,
    totalSteps,
    direction,
    canGoBack,
    note,
    setNote,
    select,
    back,
    restart,
  } = useWizard(tree);

  const isComplete = state.status === "complete";
  const answers = isComplete ? state.answers : null;

  const { status, submit, reset } = useRecommend();

  const findMovies = useCallback(() => {
    void submit({ mode: "WIZARD", picks: [...picks], note: answers?.note });
  }, [submit, picks, answers?.note]);

  // Desktop keyboard shortcuts (F-16): 1–9 pick the matching option, Esc /
  // Backspace go back. Driven purely by `step.options`, so the tree stays the
  // only place step logic lives (CLAUDE.md rule 3).
  const busy = status.state === "loading" || status.state === "error";
  useEffect(() => {
    if (busy) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      if ((event.key === "Escape" || event.key === "Backspace") && canGoBack) {
        event.preventDefault();
        back();
        return;
      }
      if (step && /^[1-9]$/.test(event.key)) {
        const option = step.options[Number(event.key) - 1];
        if (!option) return;
        event.preventDefault();
        select(option.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, canGoBack, back, step, select]);

  if (status.state === "loading") {
    return (
      <main className="flex flex-1 flex-col px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Curating />
      </main>
    );
  }

  if (status.state === "error") {
    return (
      <main className="flex flex-1 flex-col px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <ErrorPanel
          onRetry={findMovies}
          secondary={{ label: "Change my answers", onClick: reset }}
          backHref="/"
        />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="mb-8 flex min-h-tap items-center gap-4">
        {canGoBack ? (
          <button
            type="button"
            onClick={back}
            aria-label="Back to the previous question"
            className="min-h-tap -ml-2 flex min-w-tap items-center justify-center rounded-full text-xl text-muted focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            ←
          </button>
        ) : (
          <Link
            href="/"
            aria-label="Leave the wizard"
            className="min-h-tap -ml-2 flex min-w-tap items-center justify-center rounded-full text-xl text-muted focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            ←
          </Link>
        )}

        {!isComplete ? <ProgressDots current={stepNumber} total={totalSteps} /> : null}
      </header>

      <p aria-live="polite" className="sr-only">
        {step ? `Step ${stepNumber} of ${totalSteps}: ${step.question}` : "All questions answered"}
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {step ? (
          <StepCard key={step.id} step={step} direction={direction} onSelect={select} />
        ) : answers ? (
          <WizardSummary
            key="summary"
            answers={answers}
            note={note}
            onNoteChange={setNote}
            onSubmit={findMovies}
            notice={status.state === "rate_limited" ? status.message : null}
            onRestart={restart}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}
