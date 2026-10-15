"use client";

import { useEffect } from "react";

import { ErrorPanel } from "@/components/ui/error-panel";

/** Any server failure inside a tab renders this — never a raw error (SPEC §7). */
export default function TabsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <ErrorPanel
        message="Something went sideways loading this page. It's on us — give it another go."
        onRetry={reset}
        backHref="/"
      />
    </main>
  );
}
