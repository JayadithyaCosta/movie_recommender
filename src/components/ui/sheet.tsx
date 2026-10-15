"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

/**
 * Route-driven modal: a bottom sheet on phones, a centered dialog from `md:`.
 * Closing pops history, so the phone's back gesture closes it too.
 */
export function Sheet({ label, children }: { label: string; children: React.ReactNode }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [close]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <motion.button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={close}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        initial={reduceMotion ? { opacity: 0 } : { y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-background ring-1 ring-white/10 focus:outline-none md:max-w-2xl md:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex justify-between p-3">
          <span aria-hidden="true" className="mx-auto mt-1 h-1.5 w-10 rounded-full bg-white/25 md:hidden" />
          <button
            type="button"
            onClick={close}
            aria-label="Close details"
            className="min-h-tap min-w-tap absolute top-2 right-2 flex items-center justify-center rounded-full bg-background/70 text-xl backdrop-blur focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            ✕
          </button>
        </div>
        <div className="-mt-[3.75rem]">{children}</div>
      </motion.div>
    </div>
  );
}
