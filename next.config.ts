import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      // The dashboard is the app's home. A config redirect runs before any
      // rendering, so "/" never needs a page of its own.
      { source: "/", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
