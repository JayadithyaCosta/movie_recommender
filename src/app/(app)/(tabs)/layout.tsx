import { Nav } from "@/components/ui/nav";

/**
 * Shell for every tabbed screen. `modal` is the parallel slot that turns a
 * movie tap into a sheet over the current page (intercepted `/movie/[id]`).
 * Bottom padding clears the phone tab bar.
 */
export default function TabsLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
      {modal}
    </>
  );
}
