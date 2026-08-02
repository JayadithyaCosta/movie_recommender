"use client";

import { motion } from "framer-motion";

import type { WizardAnswers } from "@/lib/wizard";

type WizardSummaryProps = {
  answers: WizardAnswers;
  onRestart: () => void;
};

/**
 * End of the wizard for F-02. F-05 replaces the disabled CTA with a
 * `POST /api/recommend` call and turns this into the loading state.
 */
export function WizardSummary({ answers, onRestart }: WizardSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex flex-1 flex-col gap-6"
    >
      <div className="space-y-2">
        <h1 className="text-3xl leading-tight font-semibold text-balance">That&apos;s enough.</h1>
        <p className="text-base text-muted">Here&apos;s what we heard:</p>
      </div>

      <ol className="flex flex-col gap-2">
        {answers.steps.map((answer) => (
          <li
            key={answer.stepId}
            className="rounded-2xl bg-surface px-5 py-3 text-base ring-1 ring-white/5"
          >
            {answer.label}
          </li>
        ))}
      </ol>

      <div className="mt-auto space-y-3">
        <button
          type="button"
          disabled
          className="min-h-tap w-full rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-accent-foreground disabled:opacity-40"
        >
          Find my 5
        </button>
        <p className="text-center text-xs text-muted">Recommendations arrive in F-05.</p>
        <button
          type="button"
          onClick={onRestart}
          className="min-h-tap w-full text-center text-sm text-muted underline underline-offset-4"
        >
          Start over
        </button>
      </div>
    </motion.div>
  );
}
