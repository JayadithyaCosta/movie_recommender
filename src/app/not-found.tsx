import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <span aria-hidden="true" className="text-6xl">
        🎞️
      </span>
      <h1 className="text-2xl font-semibold">This reel is missing</h1>
      <p className="text-base text-muted">The page you&apos;re after doesn&apos;t exist, or it&apos;s been cut.</p>
      <Link
        href="/"
        className="min-h-tap flex w-full items-center justify-center rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-accent-foreground"
      >
        Back to start
      </Link>
    </main>
  );
}
