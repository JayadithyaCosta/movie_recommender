"use client";

import type { WizardOption } from "@/lib/wizard";

import { OptionTile } from "./option-tile";

type OptionGridProps = {
  options: WizardOption[];
  onSelect: (optionId: string) => void;
};

/**
 * Four or more options go two-up so a whole step fits one phone screen
 * without scrolling; short lists (pacing) stay full-width and roomy.
 */
export function OptionGrid({ options, onSelect }: OptionGridProps) {
  const twoUp = options.length >= 4;
  return (
    <div className={twoUp ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
      {options.map((option) => (
        <OptionTile key={option.id} option={option} onSelect={onSelect} />
      ))}
    </div>
  );
}
