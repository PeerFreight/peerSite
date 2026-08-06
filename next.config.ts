import type { NextConfig } from "next";
// Relative, not "@/lib/site": next.config.ts is loaded outside the tsconfig
// path-alias resolution the app code gets.
import { SITE_URL } from "./lib/site";

/**
 * CSP starts in Report-Only so a missed allowance degrades to a console
 * report, not a broken page; enforce after a soak. 'unsafe-inline' script is
 * the ChromeScript inline tag + Next's own hydration payloads; style covers
 * Tailwind/React inline styles. The Google hosts are the Maps JS SDK
 * (tracking map) and its tile/font fetches.
 */
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://maps.googleapis.com https://maps.gstatic.com https://*.ggpht.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://maps.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
];

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // The PGlite dev database (scripts/dev-db.ts) lives in the project root
      // and writes on every query; watching it triggers spurious recompiles
      // that can corrupt the dev bundle mid-request.
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.git/**", "**/.devdb/**"],
      };
    }
    return config;
  },
  async redirects() {
    return [
      {
        // The production deployment is also served, unauthenticated, at its
        // bare .vercel.app alias, so the whole site exists twice on the public
        // web. Point that copy at the canonical host. Matched on the exact
        // host: preview aliases sit behind Vercel SSO, are never crawlable,
        // and have to stay reachable for review.
        source: "/:path*",
        has: [{ type: "host", value: "peer-site.vercel.app" }],
        destination: `${SITE_URL}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
