"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const LINES = [
  "Reading the room…",
  "Pulling from the archives…",
  "Checking every pick is real…",
  "Ranking your five…",
];

/**
 * Shown while `/api/recommend` runs (typically 3–8s). Five poster slots fill in
 * turn so the wait reads as progress toward exactly five picks.
 */
export function Curating({ label = "Curating your five" }: { label?: string }) {
  const reduceMotion = useReducedMotion();
  const [line, setLine] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setLine((current) => (current + 1) % LINES.length), 1800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-1 flex-col items-center justify-center gap-10 text-center"
    >
      <div className="flex items-end gap-2" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((slot) => (
          <motion.div
            key={slot}
            className="h-24 w-14 rounded-lg bg-surface ring-1 ring-white/10"
            animate={
              reduceMotion
                ? undefined
                : { opacity: [0.35, 1, 0.35], y: [0, -8, 0], backgroundColor: ["#16161d", "#2a2610", "#16161d"] }
            }
            transition={{ duration: 1.6, repeat: Infinity, delay: slot * 0.18, ease: "easeInOut" }}
          />
        ))}
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{label}</h1>
        <motion.p
          key={line}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-base text-muted"
        >
          {LINES[line]}
        </motion.p>
      </div>
    </motion.div>
  );
}
