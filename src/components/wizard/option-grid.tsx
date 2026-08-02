"use client";

import type { WizardOption } from "@/lib/wizard";

import { OptionTile } from "./option-tile";

type OptionGridProps = {
  options: WizardOption[];
  onSelect: (optionId: string) => void;
};

export function OptionGrid({ options, onSelect }: OptionGridProps) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => (
        <OptionTile key={option.id} option={option} onSelect={onSelect} />
      ))}
    </div>
  );
}
