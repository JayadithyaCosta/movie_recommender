import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Movie Recs",
  description: "Five movies worth your night, picked for how you feel right now.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  // The wizard relies on a stable full-screen viewport; zoom-on-tap breaks it.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Desktop is a centered phone-width column (CLAUDE.md rule 5). */}
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">{children}</div>
      </body>
    </html>
  );
}
