"use client";

import Link from "next/link";

type ErrorPanelProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Secondary escape hatch; omitted when the retry is the only sensible move. */
  backHref?: string;
  backLabel?: string;
  /** Extra in-place action, e.g. "Change my answers" in the wizard. */
  secondary?: { label: string; onClick: () => void };
};

/** The friendly face of every upstream failure (SPEC §7) — never a raw error. */
export function ErrorPanel({
  title = "Our film curator is napping",
  message = "We couldn't put your five together just now. Your answers are saved — give it another go.",
  onRetry,
  retryLabel = "Try again",
  backHref,
  backLabel = "Back to start",
  secondary,
}: ErrorPanelProps) {
  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <span aria-hidden="true" className="text-6xl">
        😴
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        <p className="mx-auto max-w-sm text-base text-muted">{message}</p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-tap w-full rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            {retryLabel}
          </button>
        ) : null}
        {secondary ? (
          <button
            type="button"
            onClick={secondary.onClick}
            className="min-h-tap w-full rounded-2xl bg-surface px-6 text-base font-medium ring-1 ring-white/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            {secondary.label}
          </button>
        ) : null}
        {backHref ? (
          <Link
            href={backHref}
            className="min-h-tap flex w-full items-center justify-center text-sm text-muted underline underline-offset-4"
          >
            {backLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
