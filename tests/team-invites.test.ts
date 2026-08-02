// Teammate invites, founder/agent path: writes a plugin-shaped invitation
// row (the /invite/[id] accept flow can't tell it apart), events it, and
// respects the signup-gate and membership walls. The shipper-side flow is
// the Better Auth plugin itself; its reads are pinned here too.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import {
  findPendingInvitationForEmail,
  getInvitationForAcceptPage,
  listOrgMembers,
  listPendingInvitations,
  type PortalDb,
} from "../lib/portal/queries";
import { INVITE_TTL_HOURS, inviteTeammateAsAdmin } from "../lib/portal/team";

let db: PortalDb;
let raw: ReturnType<typeof drizzle<typeof schema>>;

const admin = { id: "user-admin", email: "aaron@peer-freight.com", emailVerified: true };
const notAdmin = { id: "user-a", email: "a@shipper-a.com", emailVerified: true };

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
    { id: "user-a", name: "Shipper A", email: "a@shipper-a.com", emailVerified: true },
    { id: "user-b", name: "Shipper B", email: "b@shipper-b.com", emailVerified: true },
    { id: "user-admin", name: "Aaron", email: "aaron@peer-freight.com", emailVerified: true },
  ]);
  await raw.insert(schema.organization).values([
    { id: "org-a", name: "North Coast Brewing", slug: "north-coast" },
    { id: "org-b", name: "Org B", slug: "org-b" },
  ]);
  await raw.insert(schema.member).values([
    { id: "m-a", organizationId: "org-a", userId: "user-a", role: "owner" },
    { id: "m-b", organizationId: "org-b", userId: "user-b", role: "owner" },
  ]);
});

describe("founder/agent invite path", () => {
  it("writes a pending plugin-shaped row, events it, and opens the signup gate", async () => {
    expect(await findPendingInvitationForEmail(db, "ops@customer.com")).toBeNull();

    const result = await inviteTeammateAsAdmin(db, admin, "org-a", "Ops@Customer.com");
    expect(result.email).toBe("ops@customer.com");
    expect(result.orgName).toBe("North Coast Brewing");
    const hours = (result.expiresAt.getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(INVITE_TTL_HOURS - 0.1);
    expect(hours).toBeLessThan(INVITE_TTL_HOURS + 0.1);

    const rows = await raw
      .select()
      .from(schema.invitation)
      .where(eq(schema.invitation.id, result.invitationId));
    expect(rows[0]).toMatchObject({
      organizationId: "org-a",
      email: "ops@customer.com",
      role: "member",
      status: "pending",
      inviterId: "user-admin",
    });

    const events = await raw
      .select()
      .from(schema.events)
      .where(eq(schema.events.eventType, "teammate_invited"));
    expect(events).toHaveLength(1);
    expect(events[0].payload).toMatchObject({ email: "ops@customer.com", role: "member" });

    // The signup gate and the accept page both see it.
    expect(await findPendingInvitationForEmail(db, "OPS@CUSTOMER.COM")).not.toBeNull();
    const accept = await getInvitationForAcceptPage(db, result.invitationId);
    expect(accept?.organizationName).toBeTruthy();
  });

  it("rejects duplicates, existing members, non-admins, and unknown orgs", async () => {
    await expect(inviteTeammateAsAdmin(db, admin, "org-a", "ops@customer.com")).rejects.toThrow(
      /pending invite/,
    );
    await expect(inviteTeammateAsAdmin(db, admin, "org-a", "a@shipper-a.com")).rejects.toThrow(
      /already a member/,
    );
    await expect(inviteTeammateAsAdmin(db, notAdmin, "org-a", "x@y.com")).rejects.toThrow(
      /Admin only/,
    );
    await expect(inviteTeammateAsAdmin(db, admin, "org-none", "x@y.com")).rejects.toThrow(
      /not found/,
    );
  });

  it("an expired invite no longer opens the signup gate", async () => {
    const result = await inviteTeammateAsAdmin(db, admin, "org-b", "late@customer.com");
    await raw
      .update(schema.invitation)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.invitation.id, result.invitationId));
    expect(await findPendingInvitationForEmail(db, "late@customer.com")).toBeNull();
  });
});

describe("membership-gated reads", () => {
  it("members see the roster; only owner/admin see pending invitations", async () => {
    const members = await listOrgMembers(db, "user-a", "org-a");
    expect(members.map((m) => m.email)).toContain("a@shipper-a.com");
    const invites = await listPendingInvitations(db, "user-a", "org-a");
    expect(invites.map((i) => i.email)).toContain("ops@customer.com");

    await expect(listOrgMembers(db, "user-b", "org-a")).rejects.toThrow();
    await expect(listPendingInvitations(db, "user-b", "org-a")).rejects.toThrow();
  });
});
