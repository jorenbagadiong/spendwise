import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // "/" is the landing page (SW-011, src/app/page.tsx). Until then it
  // redirected to /dashboard, which is still the app's entry point.
};

export default nextConfig;
