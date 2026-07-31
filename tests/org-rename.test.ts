// Settings company rename: membership plus an owner/admin role gate, and the
// rename lands on the append-only timeline. Same PGlite harness as the other
// query-layer tests.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { desc, eq } from "drizzle-orm";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { updateOrganizationName, type PortalDb } from "../lib/portal/queries";

let db: PortalDb;
let raw: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  const client = new PGlite();
  const dir = join(__dirname, "..", "db", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(dir, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await client.exec(statement);
    }
  }
  raw = drizzle(client, { schema });
  db = raw as unknown as PortalDb;

  await raw.insert(schema.user).values([
    { id: "owner-a", name: "Owner A", email: "owner@shipper-a.com", emailVerified: true },
    { id: "member-a", name: "Member A", email: "member@shipper-a.com", emailVerified: true },
    { id: "user-b", name: "Shipper B", email: "b@shipper-b.com", emailVerified: true },
  ]);
  await raw.insert(schema.organization).values([
    { id: "org-a", name: "Org A", slug: "org-a" },
    { id: "org-b", name: "Org B", slug: "org-b" },
  ]);
  await raw.insert(schema.member).values([
    { id: "m-owner-a", organizationId: "org-a", userId: "owner-a", role: "owner" },
    { id: "m-member-a", organizationId: "org-a", userId: "member-a", role: "member" },
    { id: "m-b", organizationId: "org-b", userId: "user-b", role: "owner" },
  ]);
});

describe("updateOrganizationName", () => {
  it("rejects a non-member outright", async () => {
    await expect(updateOrganizationName(db, "user-b", "org-a", "Hijacked")).rejects.toThrow(
      /not a member/i,
    );
  });

  it("rejects the member role", async () => {
    await expect(updateOrganizationName(db, "member-a", "org-a", "Renamed")).rejects.toThrow(
      /owner or admin/i,
    );
    const org = await raw.query.organization.findFirst({
      where: eq(schema.organization.id, "org-a"),
    });
    expect(org?.name).toBe("Org A");
  });

  it("lets the owner rename and writes the timeline event", async () => {
    await updateOrganizationName(db, "owner-a", "org-a", "Org A Logistics");
    const org = await raw.query.organization.findFirst({
      where: eq(schema.organization.id, "org-a"),
    });
    expect(org?.name).toBe("Org A Logistics");
    const events = await raw
      .select()
      .from(schema.events)
      .where(eq(schema.events.organizationId, "org-a"))
      .orderBy(desc(schema.events.createdAt));
    expect(events[0]?.eventType).toBe("org_renamed");
    expect(events[0]?.payload).toMatchObject({ from: "Org A", to: "Org A Logistics" });
  });

  it("no-ops on an unchanged name (no duplicate event)", async () => {
    await updateOrganizationName(db, "owner-a", "org-a", "Org A Logistics");
    const events = await raw
      .select()
      .from(schema.events)
      .where(eq(schema.events.eventType, "org_renamed"));
    expect(events.length).toBe(1);
  });
});
