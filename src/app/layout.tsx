import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { RegisterServiceWorker } from "@/components/ui/register-sw";
import { env } from "@/lib/env";

// "optional": on a slow phone the first paint keeps the metric-matched
// fallback instead of re-laying-out every reason line when Geist arrives —
// that late swap was the results page's LCP.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "optional",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Movie Recs",
  description: "Five movies worth your night, picked for how you feel right now.",
  applicationName: "Movie Recs",
  appleWebApp: { capable: true, title: "Movie Recs", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  // Pinch-zoom stays enabled (WCAG 1.4.4). iOS focus-zoom is avoided instead
  // by keeping every input at 16px (`text-base`).
  width: "device-width",
  initialScale: 1,
  // Lets env(safe-area-inset-*) pad the tab bar and CTAs around the notch / home bar.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Each route group sets its own column width — see (app)/discover and (app)/(tabs). */}
        <div className="flex min-h-dvh w-full flex-col">{children}</div>
        <RegisterServiceWorker enabled={env.NODE_ENV === "production"} />
      </body>
    </html>
  );
}
