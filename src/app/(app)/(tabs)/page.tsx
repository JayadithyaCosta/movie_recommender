import Link from "next/link";

import { SurpriseButton } from "@/components/wizard/surprise-button";

const STEPS = [
  { emoji: "👆", text: "Tap a mood — four taps, no typing" },
  { emoji: "🎬", text: "Get five real films, each with a reason" },
  { emoji: "❤️", text: "Rate them and your For You feed learns" },
];

/**
 * One column on phones (copy, steps, thumb-reach CTAs at the bottom); from
 * `lg:` a two-column hero — pitch and CTAs left, the three steps as cards right.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between gap-10 px-6 pt-14 pb-6 md:justify-center md:gap-12 md:pt-10 lg:grid lg:max-w-6xl lg:grid-cols-[1.15fr_1fr] lg:content-center lg:items-center lg:gap-x-16 lg:gap-y-10 lg:px-8 lg:py-16">
      <div className="space-y-6 lg:col-start-1 lg:row-start-1 lg:space-y-8">
        <p className="text-sm tracking-[0.2em] text-accent uppercase">Movie Recs</p>
        <h1 className="text-4xl leading-tight font-semibold text-balance md:text-5xl lg:text-6xl lg:leading-[1.05]">
          Five movies worth your night.
        </h1>
        <p className="text-base text-muted lg:max-w-lg lg:text-lg">
          Tell us what you feel like in a few taps, and we&apos;ll hand back five picks — no
          scrolling, no endless grid.
        </p>
        <ul className="space-y-3 lg:hidden">
          {STEPS.map((step) => (
            <li key={step.text} className="flex items-center gap-3 text-sm text-foreground/80">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-white/10"
              >
                {step.emoji}
              </span>
              {step.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 lg:col-start-1 lg:row-start-2 lg:flex lg:max-w-lg lg:gap-3 lg:space-y-0 lg:self-start lg:[&>*]:flex-1">
        <Link
          href="/discover"
          className="min-h-tap flex w-full items-center justify-center rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-accent-foreground transition-transform focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-[0.98]"
        >
          I feel like…
        </Link>
        <SurpriseButton />
      </div>

      <ol className="hidden lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
        {STEPS.map((step, index) => (
          <li
            key={step.text}
            className="flex items-center gap-5 rounded-3xl bg-surface p-6 ring-1 ring-white/5"
          >
            <span
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-background text-2xl ring-1 ring-white/10"
            >
              {step.emoji}
            </span>
            <div className="space-y-1">
              <p className="text-xs tracking-wider text-accent uppercase">Step {index + 1}</p>
              <p className="text-lg leading-snug font-medium">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
