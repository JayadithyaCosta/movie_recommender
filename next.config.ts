import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // All posters/backdrops/logos come from TMDB's CDN (SPEC §5).
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" }],
  },
};

export default nextConfig;
