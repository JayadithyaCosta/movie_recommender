import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between px-6 pt-16 pb-6">
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

      <Link
        href="/discover"
        className="min-h-tap bg-accent text-accent-foreground focus-visible:ring-accent flex w-full items-center justify-center rounded-2xl px-6 py-4 text-base font-semibold focus-visible:ring-2 focus-visible:outline-none"
      >
        I feel like…
      </Link>
    </main>
  );
}
