/**
 * The one canonical origin for the public site. Every absolute URL we hand to a
 * crawler — canonical tags, sitemap entries, the robots.txt sitemap pointer —
 * has to agree on this exact host, or Google clusters the variants and picks a
 * canonical for us.
 */
export const SITE_URL = "https://www.peer-freight.com";
