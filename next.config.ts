import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The dev backend serves uploads from http://localhost:5000, whose
    // hostname resolves to a private IP. Next.js 16 blocks optimizing such
    // images by default (SSRF protection), so opt in for local development.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
      {
        // The backend stores media as absolute http:// URLs (e.g. the
        // Render deployment at instagram-back-jsr6.onrender.com), so allow
        // any http host too rather than hardcoding a single one.
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
