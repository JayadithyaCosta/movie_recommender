"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: React.ReactNode; match: (path: string) => boolean };

const ICON = "size-6";

const TABS: Tab[] = [
  {
    href: "/",
    label: "Tonight",
    match: (path) => path === "/" || path.startsWith("/results") || path.startsWith("/movie"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICON} aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18M8 5l2 4M14 5l2 4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/for-you",
    label: "For You",
    match: (path) => path.startsWith("/for-you"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICON} aria-hidden="true">
        <path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6L12 16.3 6.6 19.3l1.3-6L3.3 9.2l6.1-.6L12 3z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    match: (path) => path.startsWith("/profile") || path.startsWith("/login"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICON} aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" strokeLinecap="round" />
      </svg>
    ),
  },
];

/**
 * Bottom tab bar on phones (thumb reach, CLAUDE.md rule 5), top bar from `md:`.
 * Not rendered inside the wizard, which stays a focused full-screen flow.
 */
export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop / tablet */}
      <header className="sticky top-0 z-30 hidden border-b border-white/5 bg-background/80 backdrop-blur md:block">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-sm font-semibold tracking-[0.2em] text-accent uppercase">
            Movie Recs
          </Link>
          <ul className="flex items-center gap-1">
            {TABS.map((tab) => {
              const active = tab.match(pathname);
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`min-h-tap flex items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                      active ? "bg-surface text-foreground" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* Phone */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none focus-visible:ring-inset ${
                    active ? "text-accent" : "text-muted"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
