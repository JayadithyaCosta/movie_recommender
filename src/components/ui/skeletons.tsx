/** Shape-matched placeholders so pages don't jump when data lands. */

const pulse = "animate-pulse rounded-xl bg-surface";

export function CardsSkeleton({ label }: { label: string }) {
  return (
    <main
      aria-busy="true"
      aria-label={label}
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-6 pb-8 md:max-w-3xl md:px-6 md:pt-10 xl:max-w-6xl"
    >
      <div className="space-y-3 px-2">
        <div className={`${pulse} h-4 w-40`} />
        <div className={`${pulse} h-7 w-64`} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex gap-4 rounded-3xl bg-surface/60 p-3 ring-1 ring-white/5 xl:flex-col ${i === 0 ? "md:col-span-2 xl:col-span-1" : ""}`}
          >
            <div className={`${pulse} aspect-[2/3] w-28 shrink-0 bg-white/5 sm:w-32 xl:w-full`} />
            <div className="flex flex-1 flex-col gap-2 py-1">
              <div className={`${pulse} h-5 w-3/4 bg-white/5`} />
              <div className={`${pulse} h-4 w-1/2 bg-white/5`} />
              <div className={`${pulse} h-16 w-full bg-white/5`} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export function PageSkeleton({ label }: { label: string }) {
  return (
    <main aria-busy="true" aria-label={label} className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-6 pt-10 md:max-w-3xl">
      <div className={`${pulse} h-14 w-14 rounded-full`} />
      <div className={`${pulse} h-8 w-2/3`} />
      <div className={`${pulse} h-11 w-full rounded-full`} />
      <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`${pulse} aspect-[2/3]`} />
        ))}
      </div>
    </main>
  );
}

export function DetailSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading movie" className="mx-auto w-full max-w-2xl md:pt-6">
      <div className="aspect-video w-full animate-pulse bg-surface md:rounded-t-3xl" />
      <div className="space-y-4 px-5 pt-6">
        <div className={`${pulse} h-8 w-2/3`} />
        <div className={`${pulse} h-4 w-1/3`} />
        <div className={`${pulse} h-24 w-full`} />
      </div>
    </main>
  );
}
