/** The wizard is a focused, phone-width column on every screen (CLAUDE.md rule 5). */
export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-md flex-1 flex-col">{children}</div>;
}
