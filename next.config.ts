import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "16kb" },
  },
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // Partial CSP preserves static rendering and Next.js inline scripts.
            value:
              "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self'; font-src 'self'; media-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'self'",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
