"use client";

import { motion, useReducedMotion } from "framer-motion";

import type { WizardOption } from "@/lib/wizard";

type OptionTileProps = {
  option: WizardOption;
  onSelect: (optionId: string) => void;
};

export function OptionTile({ option, onSelect }: OptionTileProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(option.id)}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className="min-h-tap flex h-full w-full flex-col gap-1 rounded-2xl bg-surface px-4 py-4 text-left ring-1 ring-white/5 transition-colors hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none active:bg-white/8"
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        {option.emoji}
      </span>
      <span className="text-lg leading-snug font-medium">{option.label}</span>
      {option.hint ? <span className="text-sm text-muted">{option.hint}</span> : null}
    </motion.button>
  );
}
