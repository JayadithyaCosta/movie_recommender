import Link from "next/link";

/**
 * The wizard is a focused, phone-width column on phones (CLAUDE.md rule 5).
 * From `md:` a slim brand bar keeps it from feeling like a dead end, and from
 * `lg:` the column widens so the option grid can go three-up (F-16).
 */
export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="hidden border-b border-white/5 md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6 lg:px-8">
          <Link
            href="/"
            className="rounded text-sm font-semibold tracking-[0.2em] text-accent uppercase focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            Movie Recs
          </Link>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-3xl lg:pt-8">{children}</div>
    </>
  );
}
