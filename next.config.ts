import type { NextConfig } from "next";
// Relative, not "@/lib/site": next.config.ts is loaded outside the tsconfig
// path-alias resolution the app code gets.
import { SITE_URL } from "./lib/site";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
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
