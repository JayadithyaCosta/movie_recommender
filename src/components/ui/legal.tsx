import { PAGE } from "@/components/ui/page";

export const CONTACT_EMAIL = "jayadithya18@gmail.com";
export const LEGAL_UPDATED = "15 October 2026";

/** Shared shell for the static policy pages linked from the Google consent screen. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className={PAGE}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm tracking-[0.2em] text-accent uppercase">Movie Recs</p>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
        </header>
        <div className="flex flex-col gap-5 text-base leading-relaxed text-muted [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </main>
  );
}
