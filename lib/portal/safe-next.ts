/**
 * ?next= comes off the URL, so an attacker controls it — /login?next=https://evil.com
 * would bounce a freshly signed-in user off-site. Confine it to a same-site
 * path: it must start with "/" but not "//" or "/\" (both are
 * protocol-relative escapes to another origin), else use the fallback.
 * Use this everywhere a redirect target is read from request input.
 */
export function safeNext(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || !raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
