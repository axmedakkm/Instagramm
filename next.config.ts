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
        protocol: "http",
        hostname: "instagram-back-jsr6.onrender.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
