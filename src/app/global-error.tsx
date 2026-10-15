"use client";

/** Last resort when the root layout itself fails; must render its own <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#0b0b0f", color: "#f3f3f5", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, margin: "20vh auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>Our film curator is napping</h1>
          <p style={{ color: "#9b9ba7" }}>Something broke on our side. Try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, minHeight: 44, padding: "0 24px", borderRadius: 16, border: 0, background: "#f5c518", color: "#16161d", fontWeight: 600 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
