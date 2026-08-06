import { and, eq, gt, lt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import * as schema from "@/db/schema";
import type { PortalDb } from "@/lib/portal/queries";

/**
 * Fixed-window per-key throttle for the unauthenticated form actions (guest
 * quote funnel, carrier setup), which bypass Better Auth's limiter because
 * they call auth.api.* server-side rather than over HTTP. Counters live in
 * the same rate_limit table Better Auth uses, under distinct key prefixes;
 * Better Auth prunes stale rows for both of us.
 *
 * Best-effort by design: the guarded increment loses at most a couple of
 * requests to a concurrent race, which is fine for abuse resistance — the
 * table is not an accounting record.
 */
export async function consumeThrottle(
  db: PortalDb,
  key: string,
  rule: { windowSeconds: number; max: number },
): Promise<boolean> {
  try {
    return await consume(db, key, rule);
  } catch (err) {
    // Fail open: this is abuse resistance, not an authorization gate — a
    // missing table or transient DB error must not take the form down.
    console.error(`throttle unavailable for ${key} — allowing request`, err);
    return true;
  }
}

async function consume(
  db: PortalDb,
  key: string,
  rule: { windowSeconds: number; max: number },
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - rule.windowSeconds * 1000;
  const rows = await db
    .select()
    .from(schema.rateLimit)
    .where(eq(schema.rateLimit.key, key))
    .limit(1);
  const row = rows[0];
  if (!row) {
    // Lost-race duplicate insert just means the concurrent request counted.
    await db
      .insert(schema.rateLimit)
      .values({ id: crypto.randomUUID(), key, count: 1, lastRequest: now })
      .onConflictDoNothing();
    return true;
  }
  if (row.lastRequest <= windowStart) {
    await db
      .update(schema.rateLimit)
      .set({ count: 1, lastRequest: now })
      .where(eq(schema.rateLimit.key, key));
    return true;
  }
  if (row.count >= rule.max) return false;
  // Guarded increment: the WHERE re-checks the window and cap so two racing
  // requests can't both sail past max.
  const updated = await db
    .update(schema.rateLimit)
    .set({ count: sql`${schema.rateLimit.count} + 1`, lastRequest: now })
    .where(
      and(
        eq(schema.rateLimit.key, key),
        gt(schema.rateLimit.lastRequest, windowStart),
        lt(schema.rateLimit.count, rule.max),
      ),
    )
    .returning({ id: schema.rateLimit.id });
  return updated.length > 0;
}

/** Client IP for throttle keys: first hop of x-forwarded-for (Vercel sets it
 * from the connecting socket), else x-real-ip, else a shared bucket so the
 * throttle still exists when no header is present (local dev). */
export async function clientIpKey(prefix: string): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || "unknown";
  return `${prefix}:${ip}`;
}
