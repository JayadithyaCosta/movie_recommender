import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { auth, signOut } from "@/auth";
import { Poster } from "@/components/movie/poster";
import { posterUrl } from "@/lib/images";
import { getHistory, getWatchlist } from "@/lib/profile";
import { getTaste, maybeRegenerateTaste, REGEN_AFTER_SIGNALS } from "@/lib/taste";

export const metadata: Metadata = { title: "Profile · Movie Recs" };

const TABS = [
  { id: "watchlist", label: "Watchlist" },
  { id: "history", label: "History" },
  { id: "taste", label: "Taste" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Search = { searchParams: Promise<{ tab?: string }> };

export default async function ProfilePage({ searchParams }: Search) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/login?callbackUrl=/profile");

  const requested = (await searchParams).tab;
  const tab: TabId = TABS.some((t) => t.id === requested) ? (requested as TabId) : "watchlist";

  const userId = user.id;
  const [watchlist, history, taste] = await Promise.all([
    getWatchlist(userId),
    getHistory(userId),
    getTaste(userId),
  ]);
  // Lazy regen check on profile load (SPEC §4.2); the new summary shows next visit.
  after(() => maybeRegenerateTaste(userId).catch((e) => console.error("[taste]", e)));

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const initial = (user.name ?? user.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-6 pb-8 md:max-w-3xl md:px-6 md:pt-10 xl:max-w-5xl">
      <header className="flex items-center gap-4 px-2">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-semibold text-accent-foreground"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{user.name ?? "Your profile"}</h1>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
        <form action={doSignOut}>
          <button
            type="submit"
            className="min-h-tap rounded-full px-4 text-sm text-muted ring-1 ring-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            Sign out
          </button>
        </form>
      </header>

      <nav aria-label="Profile sections" className="flex gap-1 rounded-full bg-surface p-1 ring-1 ring-white/5">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/profile?tab=${t.id}`}
            replace
            scroll={false}
            aria-current={tab === t.id ? "page" : undefined}
            className={`min-h-tap flex flex-1 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
              tab === t.id ? "bg-background text-foreground ring-1 ring-white/10" : "text-muted"
            }`}
          >
            {t.label}
            {t.id === "watchlist" && watchlist.length > 0 ? (
              <span className="ml-1.5 text-xs text-muted">{watchlist.length}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      {tab === "taste" ? (
        <TasteSection taste={taste} />
      ) : tab === "watchlist" ? (
        watchlist.length > 0 ? (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {watchlist.map((movie) => (
              <li key={movie.id}>
                <Link
                  href={`/movie/${movie.id}`}
                  scroll={false}
                  className="block space-y-1.5 rounded-xl focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <Poster path={movie.posterPath} title={movie.title} sizes="(min-width: 768px) 160px, 33vw" />
                  <p className="truncate text-xs text-muted">{movie.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            emoji="🔖"
            title="Nothing saved yet"
            body="Tap Save on any pick and it lands here for movie night."
          />
        )
      ) : history.length > 0 ? (
        <div className="space-y-6">
          {history.map((group) => (
            <section key={group.label} className="space-y-2">
              <h2 className="px-2 text-xs tracking-wider text-muted uppercase">{group.label}</h2>
              <ul className="space-y-2">
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`/results/${entry.id}`}
                      className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-white/5 transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                    >
                      <div className="flex shrink-0 -space-x-4" aria-hidden="true">
                        {entry.posters.slice(0, 3).map((poster) => {
                          const src = posterUrl(poster.posterPath, "w185");
                          return (
                            <div key={poster.id} className="relative h-14 w-10 overflow-hidden rounded-md bg-background ring-2 ring-surface">
                              {src ? <Image src={src} alt="" fill sizes="40px" className="object-cover" /> : null}
                            </div>
                          );
                        })}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{entry.label}</p>
                        <p className="truncate text-xs text-muted">
                          {entry.posters.map((p) => p.title).join(", ")}
                        </p>
                      </div>
                      <time className="shrink-0 text-xs text-muted" dateTime={entry.createdAt.toISOString()}>
                        {entry.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <Empty emoji="🎬" title="No picks yet" body="Run the wizard and your picks will show up here." cta />
      )}
    </main>
  );
}

function Empty({ emoji, title, body, cta }: { emoji: string; title: string; body: string; cta?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-12 text-center ring-1 ring-white/5">
      <span aria-hidden="true" className="text-5xl">
        {emoji}
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-xs text-sm text-muted">{body}</p>
      {cta ? (
        <Link
          href="/discover"
          className="min-h-tap mt-2 flex items-center rounded-2xl bg-accent px-6 text-sm font-semibold text-accent-foreground"
        >
          I feel like…
        </Link>
      ) : null}
    </div>
  );
}

function TasteSection({ taste }: { taste: Awaited<ReturnType<typeof getTaste>> }) {
  const weights = Object.entries(taste?.genreWeights ?? {});
  const toGo = Math.max(0, REGEN_AFTER_SIGNALS - (taste?.signalCount ?? 0));

  return (
    <section className="space-y-6">
      <div className="space-y-3 rounded-3xl bg-surface p-6 ring-1 ring-white/5">
        <h2 className="text-xs tracking-wider text-accent uppercase">Your taste, as we understand it</h2>
        {taste?.summary ? (
          <p className="text-lg leading-relaxed text-balance">{taste.summary}</p>
        ) : (
          <p className="text-base text-muted">
            We&apos;re still getting to know you. Rate a few picks — ❤️ the ones you love, ✕ the ones
            you don&apos;t — and we&apos;ll write up your taste
            {toGo > 0 ? ` after ${toGo} more` : " shortly"}.
          </p>
        )}
        <Link
          href="/discover"
          className="inline-flex min-h-tap items-center text-sm text-muted underline underline-offset-4 hover:text-foreground"
        >
          Not quite right? Run the wizard again
        </Link>
      </div>

      {weights.length > 0 ? (
        <div className="space-y-3 px-2">
          <h2 className="text-xs tracking-wider text-muted uppercase">What you reach for</h2>
          <ul className="space-y-3">
            {weights.map(([genre, weight]) => (
              <li key={genre} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{genre}</span>
                  <span className="text-muted">{Math.round(weight * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, weight * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
