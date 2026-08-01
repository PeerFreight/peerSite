import type { NextConfig } from "next";

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
};

export default nextConfig;
