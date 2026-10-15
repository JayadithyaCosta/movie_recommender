"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js` in production only — in dev a caching worker would
 * serve stale bundles and fight hot reload.
 */
export function RegisterServiceWorker({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.warn("Service worker registration failed", error);
    });
  }, [enabled]);
  return null;
}
