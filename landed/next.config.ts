import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The public host proxies to `next dev`; without this the page renders but never hydrates.
  allowedDevOrigins: ["buycheap.aihkexam.com"],
};

export default nextConfig;
