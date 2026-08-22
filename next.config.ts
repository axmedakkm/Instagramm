import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
        protocol: "https",
        hostname: "instagram-back-jsr6.onrender.com",
        pathname: "/**",
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
