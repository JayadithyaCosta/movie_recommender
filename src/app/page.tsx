/**
 * Phase 0 placeholder. F-02 replaces the CTA below with a link to the
 * `/discover` wizard; nothing here is meant to survive that.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col justify-between px-6 pt-16 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="space-y-4">
        <p className="text-muted text-sm tracking-[0.2em] uppercase">Movie Recs</p>
        <h1 className="text-4xl leading-tight font-semibold text-balance">
          Five movies worth your night.
        </h1>
        <p className="text-muted text-base">
          Tell us what you feel like in a few taps, and we&apos;ll hand back five picks — no
          scrolling, no endless grid.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          disabled
          className="min-h-tap bg-accent text-accent-foreground w-full rounded-2xl px-6 py-4 text-base font-semibold disabled:opacity-40"
        >
          I feel like…
        </button>
        <p className="text-muted text-center text-xs">Wizard arrives in F-02.</p>
      </div>
    </main>
  );
}
