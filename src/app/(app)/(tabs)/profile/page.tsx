import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { auth, signOut } from "@/auth";
import { Poster } from "@/components/movie/poster";
import { PAGE } from "@/components/ui/page";
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
    <main className={`${PAGE} lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-10`}>
      <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
        <header className="lg:bg-surface flex items-center gap-4 px-2 lg:flex-col lg:items-start lg:gap-5 lg:rounded-3xl lg:p-6 lg:ring-1 lg:ring-white/5">
          <span
            aria-hidden="true"
            className="bg-accent text-accent-foreground flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold lg:size-16 lg:text-2xl"
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1 lg:w-full">
            <h1 className="truncate text-xl font-semibold">{user.name ?? "Your profile"}</h1>
            <p className="text-muted truncate text-sm">{user.email}</p>
          </div>
          <dl className="hidden w-full grid-cols-2 gap-3 text-center lg:grid">
            <div className="bg-background rounded-2xl px-3 py-3 ring-1 ring-white/5">
              <dt className="text-muted text-xs">Saved</dt>
              <dd className="text-lg font-semibold">{watchlist.length}</dd>
            </div>
            <div className="bg-background rounded-2xl px-3 py-3 ring-1 ring-white/5">
              <dt className="text-muted text-xs">Sessions</dt>
              <dd className="text-lg font-semibold">
                {history.reduce((total, group) => total + group.entries.length, 0)}
              </dd>
            </div>
          </dl>
          <form action={doSignOut} className="lg:w-full">
            <button
              type="submit"
              className="min-h-tap text-muted hover:text-foreground focus-visible:ring-accent rounded-full px-4 text-sm ring-1 ring-white/10 focus-visible:ring-2 focus-visible:outline-none lg:w-full"
            >
              Sign out
            </button>
          </form>
        </header>
        {taste?.summary && tab !== "taste" ? (
          <Link
            href="/profile?tab=taste"
            replace
            scroll={false}
            className="bg-surface focus-visible:ring-accent hidden space-y-2 rounded-3xl p-6 ring-1 ring-white/5 transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:outline-none lg:block"
          >
            <span className="text-accent block text-xs tracking-wider uppercase">Your taste</span>
            <span className="text-foreground/85 line-clamp-5 block text-sm leading-relaxed">
              {taste.summary}
            </span>
          </Link>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        <nav
          aria-label="Profile sections"
          className="bg-surface flex gap-1 rounded-full p-1 ring-1 ring-white/5"
        >
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/profile?tab=${t.id}`}
              replace
              scroll={false}
              aria-current={tab === t.id ? "page" : undefined}
              className={`min-h-tap focus-visible:ring-accent flex flex-1 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                tab === t.id ? "bg-background text-foreground ring-1 ring-white/10" : "text-muted"
              }`}
            >
              {t.label}
              {t.id === "watchlist" && watchlist.length > 0 ? (
                <span className="text-muted ml-1.5 text-xs">{watchlist.length}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        {tab === "taste" ? (
          <TasteSection taste={taste} />
        ) : tab === "watchlist" ? (
          watchlist.length > 0 ? (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:gap-4 xl:grid-cols-6">
              {watchlist.map((movie) => (
                <li key={movie.id}>
                  <Link
                    href={`/movie/${movie.id}`}
                    scroll={false}
                    className="group focus-visible:ring-accent block space-y-1.5 rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Poster
                      path={movie.posterPath}
                      title={movie.title}
                      sizes="(min-width: 1280px) 150px, (min-width: 768px) 160px, 33vw"
                    />
                    <p className="text-muted group-hover:text-foreground truncate text-xs">
                      {movie.title}
                    </p>
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
                <h2 className="text-muted px-2 text-xs tracking-wider uppercase">{group.label}</h2>
                <ul className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                  {group.entries.map((entry) => (
                    <li key={entry.id}>
                      <Link
                        href={`/results/${entry.id}`}
                        className="bg-surface focus-visible:ring-accent flex items-center gap-3 rounded-2xl p-3 ring-1 ring-white/5 transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <div className="flex shrink-0 -space-x-4" aria-hidden="true">
                          {entry.posters.slice(0, 3).map((poster) => {
                            const src = posterUrl(poster.posterPath, "w185");
                            return (
                              <div
                                key={poster.id}
                                className="bg-background ring-surface relative h-14 w-10 overflow-hidden rounded-md ring-2"
                              >
                                {src ? (
                                  <Image
                                    src={src}
                                    alt=""
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{entry.label}</p>
                          <p className="text-muted truncate text-xs">
                            {entry.posters.map((p) => p.title).join(", ")}
                          </p>
                        </div>
                        <time
                          className="text-muted shrink-0 text-xs"
                          dateTime={entry.createdAt.toISOString()}
                        >
                          {entry.createdAt.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </time>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <Empty
            emoji="🎬"
            title="No picks yet"
            body="Run the wizard and your picks will show up here."
            cta
          />
        )}
      </div>
    </main>
  );
}

function Empty({
  emoji,
  title,
  body,
  cta,
}: {
  emoji: string;
  title: string;
  body: string;
  cta?: boolean;
}) {
  return (
    <div className="bg-surface flex flex-col items-center gap-3 rounded-3xl px-6 py-12 text-center ring-1 ring-white/5">
      <span aria-hidden="true" className="text-5xl">
        {emoji}
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted max-w-xs text-sm">{body}</p>
      {cta ? (
        <Link
          href="/discover"
          className="min-h-tap bg-accent text-accent-foreground mt-2 flex items-center rounded-2xl px-6 text-sm font-semibold"
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
      <div className="bg-surface space-y-3 rounded-3xl p-6 ring-1 ring-white/5">
        <h2 className="text-accent text-xs tracking-wider uppercase">
          Your taste, as we understand it
        </h2>
        {taste?.summary ? (
          <p className="text-lg leading-relaxed text-balance">{taste.summary}</p>
        ) : (
          <p className="text-muted text-base">
            We&apos;re still getting to know you. Rate a few picks — ❤️ the ones you love, ✕ the
            ones you don&apos;t — and we&apos;ll write up your taste
            {toGo > 0 ? ` after ${toGo} more` : " shortly"}.
          </p>
        )}
        <Link
          href="/discover"
          className="min-h-tap text-muted hover:text-foreground inline-flex items-center text-sm underline underline-offset-4"
        >
          Not quite right? Run the wizard again
        </Link>
      </div>

      {weights.length > 0 ? (
        <div className="space-y-3 px-2">
          <h2 className="text-muted text-xs tracking-wider uppercase">What you reach for</h2>
          <ul className="space-y-3">
            {weights.map(([genre, weight]) => (
              <li key={genre} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{genre}</span>
                  <span className="text-muted">{Math.round(weight * 100)}%</span>
                </div>
                <div className="bg-surface h-2 overflow-hidden rounded-full" aria-hidden="true">
                  <div
                    className="bg-accent h-full rounded-full"
                    style={{ width: `${Math.max(4, weight * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
