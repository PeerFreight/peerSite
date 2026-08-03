import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Crawling is open; indexability is decided per route by page `metadata`, not
 * here. Disallowing the noindex routes would keep crawlers from ever reading
 * the noindex tag on them.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
