import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // All pages require auth – disable static prerendering globally
  experimental: {},
};

export default nextConfig;
