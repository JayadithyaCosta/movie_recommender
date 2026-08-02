"use client";

type ProgressDotsProps = {
  /** 1-based position of the current step. */
  current: number;
  total: number;
};

export function ProgressDots({ current, total }: ProgressDotsProps) {
  return (
    <ol className="flex items-center gap-2" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, index) => {
        const position = index + 1;
        const isCurrent = position === current;
        const isDone = position < current;

        return (
          <li
            key={position}
            aria-current={isCurrent ? "step" : undefined}
            className={[
              "h-1.5 rounded-full transition-all duration-300",
              isCurrent ? "w-6 bg-accent" : "w-1.5",
              isDone ? "bg-accent/40" : isCurrent ? "" : "bg-white/15",
            ].join(" ")}
          />
        );
      })}
    </ol>
  );
}
