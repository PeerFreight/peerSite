import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Indexable marketing routes only. /quote, /carrier-setup, and /styleguide all
 * ship `robots: { index: false }`, so listing them here would ask Google to
 * crawl pages we immediately tell it to drop.
 *
 * `lastModified` is deliberately omitted. Google only leans on <lastmod> when
 * it tracks real content changes, and stamping build time would claim every
 * page changed on every deploy.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/` }, { url: `${SITE_URL}/carriers` }];
}
