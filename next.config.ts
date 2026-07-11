import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers are set in middleware.ts for dynamic CSP nonces
  // Static security headers here cover what middleware doesn't
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Only set security headers here that don't need per-request nonces
          // CSP and HSTS are handled in middleware.ts
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
          }
        ]
      },
      // API-specific headers
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate"
          },
          {
            key: "Pragma",
            value: "no-cache"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
