import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  // The dev-tools badge obscures fixed mobile action rails during localhost
  // responsive audits. Error overlays and build diagnostics remain enabled.
  devIndicators: false,
  // Browser/E2E dev sessions use an isolated output directory so a concurrent
  // production build cannot replace their webpack chunks mid-audit.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Explicitly allow only local loopback hosts for Playwright and manual dev
  // sessions. Production does not inherit a wildcard origin allowance.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [{ source: "/attendance/controlled-repair", destination: "/attendance/review?week=2026-10-19&batch=34ffbb89-be58-4d74-b6ed-a8ab3a25cda5", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          // Deliberately avoid a script-src directive here: Next.js and the
          // Supabase client need a nonce-based policy before that can be made
          // strict. These directives are safe today and still close common
          // injection, clickjacking and form-exfiltration paths.
          { key: "Content-Security-Policy", value: "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      // Leave room for multipart headers while enforcing the 10 MB file limit in code and Storage.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
