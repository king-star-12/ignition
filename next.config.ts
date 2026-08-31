import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle, so the container image stays small.
  output: "standalone",
  // Keeps the dev overlay out of demo captures.
  devIndicators: false,
  /* config options here */
};

export default nextConfig;
