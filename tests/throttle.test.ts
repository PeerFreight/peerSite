// The per-IP throttle behind the unauthenticated form actions (guest quote
// funnel, carrier setup): fixed window, hard cap, per-key isolation. Runs
// against an in-memory PGlite Postgres with the real migrations applied so
// the guarded-increment SQL is exercised for real.
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { consumeThrottle } from "../lib/portal/throttle";
import type { PortalDb } from "../lib/portal/queries";

let db: PortalDb;

beforeAll(async () => {
  const client = new PGlite();
  const dir = join(__dirname, "..", "db", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(dir, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await client.exec(statement);
    }
  }
  db = drizzle(client, { schema }) as unknown as PortalDb;
});

const RULE = { windowSeconds: 3600, max: 3 };

describe("consumeThrottle", () => {
  it("allows up to max within the window, then refuses", async () => {
    expect(await consumeThrottle(db, "guest-rfq:1.2.3.4", RULE)).toBe(true);
    expect(await consumeThrottle(db, "guest-rfq:1.2.3.4", RULE)).toBe(true);
    expect(await consumeThrottle(db, "guest-rfq:1.2.3.4", RULE)).toBe(true);
    expect(await consumeThrottle(db, "guest-rfq:1.2.3.4", RULE)).toBe(false);
    expect(await consumeThrottle(db, "guest-rfq:1.2.3.4", RULE)).toBe(false);
  });

  it("keys are independent — another IP or another form is unaffected", async () => {
    expect(await consumeThrottle(db, "guest-rfq:5.6.7.8", RULE)).toBe(true);
    expect(await consumeThrottle(db, "carrier-setup:1.2.3.4", RULE)).toBe(true);
  });

  it("a stale window resets the count instead of refusing forever", async () => {
    const key = "guest-rfq:9.9.9.9";
    for (let i = 0; i < 3; i++) expect(await consumeThrottle(db, key, RULE)).toBe(true);
    expect(await consumeThrottle(db, key, RULE)).toBe(false);
    // Age the row past the window, as if an hour passed.
    await db
      .update(schema.rateLimit)
      .set({ lastRequest: Date.now() - (RULE.windowSeconds + 1) * 1000 })
      .where(eq(schema.rateLimit.key, key));
    expect(await consumeThrottle(db, key, RULE)).toBe(true);
    const [row] = await db.select().from(schema.rateLimit).where(eq(schema.rateLimit.key, key));
    expect(row.count).toBe(1);
  });
});
