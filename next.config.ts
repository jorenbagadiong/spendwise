import type { NextConfig } from "next";

// Set NEXT_PUBLIC_BASE_PATH=/spendwise on Vercel; leave it unset locally.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  basePath,
  cacheComponents: true,
  partialPrefetching: true,
  // "/" is the landing page (SW-011, src/app/page.tsx). Until then it
  // redirected to /dashboard, which is still the app's entry point.
  async redirects() {
    // When a base path is set, send the bare root (spendwise-ten-murex.vercel.app/)
    // to /spendwise instead of showing a 404.
    return basePath
      ? [
          {
            source: "/",
            destination: basePath,
            basePath: false,
            permanent: false,
          },
        ]
      : [];
  },
};

export default nextConfig;
