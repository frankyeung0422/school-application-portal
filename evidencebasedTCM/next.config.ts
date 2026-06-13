import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev-server requests (HMR, _next/*) from non-localhost origins.
  // Without this, browsers loading the app from the LAN IP get cross-origin
  // 403s on /_next/* assets, which breaks Fast Refresh and the auth/session
  // fetches the navbar depends on.
  allowedDevOrigins: [
    "10.50.10.30",
    "*.local",
    "*.devtunnels.ms",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.trycloudflare.com",
    "evidencetcm.aihkexam.com",
    "*.aihkexam.com",
  ],
};

export default nextConfig;
