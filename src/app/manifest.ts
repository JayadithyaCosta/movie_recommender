import type { MetadataRoute } from "next";

/** Installable PWA (F-13). Served by Next at /manifest.webmanifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Movie Recs",
    short_name: "Movie Recs",
    description: "Five movies worth your night, picked for how you feel right now.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b0f",
    theme_color: "#0b0b0f",
    categories: ["entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "I feel like…", url: "/discover", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "For You", url: "/for-you", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
