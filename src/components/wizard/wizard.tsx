"use client";

import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

import type { StepTree } from "@/lib/wizard";

import { ProgressDots } from "./progress-dots";
import { StepCard } from "./step-card";
import { useWizard } from "./use-wizard";
import { WizardSummary } from "./wizard-summary";

type WizardProps = {
  tree: StepTree;
};

export function Wizard({ tree }: WizardProps) {
  const {
    state,
    step,
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

  // F-05 replaces this with POST /api/recommend; until then, completing the
  // wizard is only observable in the console (PLAN.md Phase 1).
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Keyed on the path, not the answers object — the object identity changes on
  // every keystroke in the note field, which would spam the console.
  const completedPath = answers?.readablePath ?? null;
  useEffect(() => {
    if (completedPath) {
      console.log("Wizard answers", answersRef.current);
    }
  }, [completedPath]);

  // Re-log once the note settles, so the note is observable too.
  const logWithNote = useCallback(() => {
    if (answersRef.current?.note) {
      console.log("Wizard answers (with note)", answersRef.current);
    }
  }, []);

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
            onNoteCommit={logWithNote}
            onRestart={restart}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}
