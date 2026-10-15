"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

import type { WizardStep } from "@/lib/wizard";

import { OptionGrid } from "./option-grid";

type StepCardProps = {
  step: WizardStep;
  direction: 1 | -1;
  onSelect: (optionId: string) => void;
};

const SLIDE_DISTANCE = 24;

export function StepCard({ step, direction, onSelect }: StepCardProps) {
  const reduceMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Each step replaces the whole screen; move focus so keyboard and screen
  // reader users land on the new question instead of the top of the document.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step.id]);

  const offset = reduceMotion ? 0 : SLIDE_DISTANCE * direction;

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, x: offset }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -offset }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex flex-1 flex-col gap-6"
    >
      <div className="space-y-2">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl leading-tight font-semibold text-balance focus:outline-none lg:text-4xl"
        >
          {step.question}
        </h1>
        {step.subtitle ? <p className="text-base text-muted">{step.subtitle}</p> : null}
        <p className="hidden text-xs text-muted/70 lg:block">
          Tip: press a number to pick, Esc to go back.
        </p>
      </div>

      <OptionGrid options={step.options} onSelect={onSelect} />
    </motion.div>
  );
}
