"use client";

import type { WizardOption } from "@/lib/wizard";

import { OptionTile } from "./option-tile";

type OptionGridProps = {
  options: WizardOption[];
  onSelect: (optionId: string) => void;
};

/**
 * Four or more options go two-up so a whole step fits one phone screen
 * without scrolling (three-up on desktop); short lists (pacing) stay
 * full-width and roomy, capped on desktop so tiles don't stretch.
 */
export function OptionGrid({ options, onSelect }: OptionGridProps) {
  const twoUp = options.length >= 4;
  return (
    <div className={twoUp ? "grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4" : "flex flex-col gap-3 lg:max-w-xl"}>
      {options.map((option, index) => (
        <OptionTile
          key={option.id}
          option={option}
          onSelect={onSelect}
          shortcut={index < 9 ? index + 1 : undefined}
        />
      ))}
    </div>
  );
}
