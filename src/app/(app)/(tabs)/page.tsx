import Link from "next/link";

import { SurpriseButton } from "@/components/wizard/surprise-button";

const STEPS = [
  { emoji: "👆", text: "Tap a mood — four taps, no typing" },
  { emoji: "🎬", text: "Get five real films, each with a reason" },
  { emoji: "❤️", text: "Rate them and your For You feed learns" },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between gap-10 px-6 pt-14 pb-6 md:justify-center md:gap-12 md:pt-10">
      <div className="space-y-6">
        <p className="text-sm tracking-[0.2em] text-accent uppercase">Movie Recs</p>
        <h1 className="text-4xl leading-tight font-semibold text-balance md:text-5xl">
          Five movies worth your night.
        </h1>
        <p className="text-base text-muted">
          Tell us what you feel like in a few taps, and we&apos;ll hand back five picks — no
          scrolling, no endless grid.
        </p>
        <ul className="space-y-3">
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

      <div className="space-y-3">
        <Link
          href="/discover"
          className="min-h-tap flex w-full items-center justify-center rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-accent-foreground transition-transform focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-[0.98]"
        >
          I feel like…
        </Link>
        <SurpriseButton />
      </div>
    </main>
  );
}
