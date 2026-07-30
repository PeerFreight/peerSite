// CI org-isolation test (plan Phase 1): two users in two orgs; the org-scoped
// query layer must never let one see the other. Runs against an in-memory
// PGlite Postgres with the real generated migrations applied, so it needs no
// external database.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import {
  getOrganizationForUser,
  listUserOrganizations,
  requireMembership,
  type PortalDb,
} from "../lib/portal/queries";

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
  const d = drizzle(client, { schema });
  db = d as unknown as PortalDb;

  await d.insert(schema.user).values([
    { id: "user-a", name: "Shipper A", email: "a@shipper-a.com", emailVerified: true },
    { id: "user-b", name: "Shipper B", email: "b@shipper-b.com", emailVerified: true },
  ]);
  await d.insert(schema.organization).values([
    { id: "org-a", name: "Org A", slug: "org-a" },
    { id: "org-b", name: "Org B", slug: "org-b" },
  ]);
  await d.insert(schema.member).values([
    { id: "m-a", organizationId: "org-a", userId: "user-a", role: "owner" },
    { id: "m-b", organizationId: "org-b", userId: "user-b", role: "owner" },
  ]);
});

describe("org isolation", () => {
  it("lists only the user's own organizations", async () => {
    const orgsA = await listUserOrganizations(db, "user-a");
    expect(orgsA.map((o) => o.id)).toEqual(["org-a"]);
    const orgsB = await listUserOrganizations(db, "user-b");
    expect(orgsB.map((o) => o.id)).toEqual(["org-b"]);
  });

  it("refuses to resolve another org through the scoped getter", async () => {
    expect(await getOrganizationForUser(db, "user-a", "org-b")).toBeNull();
    expect(await getOrganizationForUser(db, "user-b", "org-a")).toBeNull();
    expect((await getOrganizationForUser(db, "user-a", "org-a"))?.id).toBe("org-a");
  });

  it("requireMembership throws across the org boundary", async () => {
    await expect(requireMembership(db, "user-a", "org-b")).rejects.toThrow();
    await expect(requireMembership(db, "user-b", "org-a")).rejects.toThrow();
    await expect(requireMembership(db, "user-a", "org-a")).resolves.toBeTruthy();
  });

  it("seeded founder emails are present and shipper emails are not auto-allowed", async () => {
    const allowed = await db.select().from(schema.allowedEmails);
    const emails = allowed.map((r) => r.email);
    expect(emails).toContain("aaron@peer-freight.com");
    expect(emails).toContain("felix@peer-freight.com");
    expect(emails).not.toContain("a@shipper-a.com");
  });
});
