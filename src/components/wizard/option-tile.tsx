"use client";

import { motion, useReducedMotion } from "framer-motion";

import type { WizardOption } from "@/lib/wizard";

type OptionTileProps = {
  option: WizardOption;
  onSelect: (optionId: string) => void;
  /** Number key that picks this tile on desktop (handled in `Wizard`). */
  shortcut?: number;
};

export function OptionTile({ option, onSelect, shortcut }: OptionTileProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(option.id)}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12 }}
      aria-keyshortcuts={shortcut ? String(shortcut) : undefined}
      className="min-h-tap flex h-full w-full flex-col gap-1 rounded-2xl bg-surface px-4 py-4 text-left ring-1 ring-white/5 transition-colors hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none active:bg-white/8 lg:p-5"
    >
      <span className="flex items-start justify-between">
        <span aria-hidden="true" className="text-2xl leading-none">
          {option.emoji}
        </span>
        {shortcut ? (
          <kbd
            aria-hidden="true"
            className="hidden size-6 items-center justify-center rounded-md bg-background font-sans text-xs text-muted ring-1 ring-white/10 lg:flex"
          >
            {shortcut}
          </kbd>
        ) : null}
      </span>
      <span className="text-lg leading-snug font-medium">{option.label}</span>
      {option.hint ? <span className="text-sm text-muted">{option.hint}</span> : null}
    </motion.button>
  );
}
