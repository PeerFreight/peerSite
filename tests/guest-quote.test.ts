// The public guest quote funnel's server-side pieces: org+owner creation
// (with slug uniqueness), the guest account schema's modes and the founder
// domain rejection, the end-to-end DB path a guest submission takes, and
// the two emails the funnel sends. Runs against in-memory PGlite with the
// real migrations, like tests/rfq-isolation.test.ts.
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { guestAccountSchema } from "../lib/portal/guest-account";
import { composeGuestWelcome, composeRfqTeamAlert } from "../lib/portal/notify";
import {
  createOrganizationWithOwner,
  createQuoteRequest,
  getQuoteRequestDetail,
  listQuoteRequests,
  listUserOrganizations,
  type PortalDb,
} from "../lib/portal/queries";
import type { RfqInput } from "../lib/portal/rfq";

let db: PortalDb;

function rfq(overrides: Partial<RfqInput> = {}): RfqInput {
  return {
    originAddress: null,
    originCity: "Petaluma",
    originState: "CA",
    originZip: "94952",
    originHours: null,
    originScheduling: "fcfs",
    destAddress: null,
    destCity: "Reno",
    destState: "NV",
    destZip: "89502",
    destHours: null,
    destScheduling: "appointment",
    pickupDate: "2026-08-05",
    pickupWindow: null,
    deliveryDate: "2026-08-06",
    deliveryWindow: null,
    dateFlexibility: "exact",
    commodity: "Packaged beer, cases on pallets",
    weightLbs: 38000,
    pieces: "26 pallets",
    dims: null,
    declaredValueUsd: "45000",
    equipment: "dry_van_53",
    temperatureF: null,
    equipmentNotes: null,
    hazmat: false,
    hazmatDetails: null,
    accessorials: ["liftgate_delivery"],
    referenceNumbers: [],
    targetRateUsd: null,
    frequency: "one_time",
    notes: null,
    ...overrides,
  };
}

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
    { id: "guest-1", name: "Dana Meyer", email: "dana@newshipper.com", emailVerified: false },
    { id: "guest-2", name: "Sam Ortiz", email: "sam@othershipper.com", emailVerified: false },
    { id: "bystander", name: "Bystander", email: "b@elsewhere.com", emailVerified: true },
  ]);
});

describe("createOrganizationWithOwner", () => {
  it("creates the org with an owner membership in one shot", async () => {
    const org = await createOrganizationWithOwner(db, "guest-1", "North Coast Brewing");
    expect(org.name).toBe("North Coast Brewing");
    expect(org.role).toBe("owner");
    expect(org.slug).toMatch(/^north-coast-brewing-[0-9a-f]{4}$/);
    const memberships = await listUserOrganizations(db, "guest-1");
    expect(memberships).toHaveLength(1);
    expect(memberships[0].id).toBe(org.id);
    expect(memberships[0].role).toBe("owner");
  });

  it("same company name twice still gets unique slugs", async () => {
    const a = await createOrganizationWithOwner(db, "guest-2", "Acme Logistics");
    const rows = await db
      .select({ slug: schema.organization.slug })
      .from(schema.organization)
      .where(eq(schema.organization.name, "Acme Logistics"));
    const b = await createOrganizationWithOwner(db, "bystander", "Acme Logistics");
    expect(b.slug).not.toBe(a.slug);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("slugifies degenerate names to something usable", async () => {
    const org = await createOrganizationWithOwner(db, "bystander", "!!!");
    expect(org.slug).toMatch(/^company-[0-9a-f]{4}$/);
  });
});

describe("guest RFQ end to end (DB path)", () => {
  it("guest's new org can file a request and read it back; others cannot", async () => {
    const org = (await listUserOrganizations(db, "guest-1"))[0];
    const requestId = await createQuoteRequest(db, "guest-1", org.id, rfq());
    const list = await listQuoteRequests(db, "guest-1", org.id);
    expect(list.map((r) => r.id)).toContain(requestId);
    const detail = await getQuoteRequestDetail(db, "guest-1", org.id, requestId);
    expect(detail?.request.commodity).toBe("Packaged beer, cases on pallets");
    expect(detail?.events.map((e) => e.eventType)).toContain("rfq_submitted");
    // The other guest's org sees nothing.
    const otherOrg = (await listUserOrganizations(db, "guest-2"))[0];
    expect(await getQuoteRequestDetail(db, "guest-2", otherOrg.id, requestId)).toBeNull();
  });
});

describe("guestAccountSchema", () => {
  const create = {
    accountMode: "create",
    accountName: "Dana Meyer",
    accountEmail: "Dana@NewShipper.com",
    accountCompany: "North Coast Brewing",
    accountPassword: "longenough1",
  };

  it("create mode requires name, company, and an 8+ char password; lowercases email", () => {
    const ok = guestAccountSchema.safeParse(create);
    expect(ok.success).toBe(true);
    if (ok.success && ok.data.accountMode === "create") {
      expect(ok.data.accountEmail).toBe("dana@newshipper.com");
    }
    const bad = guestAccountSchema.safeParse({
      ...create,
      accountName: " ",
      accountCompany: "",
      accountPassword: "short",
    });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      const fields = bad.error.issues.map((i) => i.path[0]);
      expect(fields).toContain("accountName");
      expect(fields).toContain("accountCompany");
      expect(fields).toContain("accountPassword");
    }
  });

  it("signin mode needs only email and any password; company optional", () => {
    const ok = guestAccountSchema.safeParse({
      accountMode: "signin",
      accountEmail: "dana@newshipper.com",
      accountPassword: "x",
      accountCompany: "",
    });
    expect(ok.success).toBe(true);
  });

  it("rejects the founder domain in both modes", () => {
    for (const accountMode of ["create", "signin"] as const) {
      const parsed = guestAccountSchema.safeParse({
        ...create,
        accountMode,
        accountEmail: "mallory@peer-freight.com",
      });
      expect(parsed.success).toBe(false);
    }
  });
});

describe("guest funnel emails", () => {
  it("team alert carries the lane, the funnel marker, and the admin deep link", () => {
    const email = composeRfqTeamAlert({
      orgName: "North Coast Brewing",
      requesterName: "Dana Meyer",
      requesterEmail: "dana@newshipper.com",
      requestId: "rfq-9",
      rfq: rfq({ hazmat: true, hazmatUnNumber: "UN1993", hazmatShippingName: "Flammable liquids, n.o.s.", hazmatClass: "3" }),
      note: "New account created through the public quote page.",
    });
    expect(email.to).toBe("team@peer-freight.com");
    expect(email.subject).toBe("New quote request: Petaluma, CA → Reno, NV");
    expect(email.text).toContain("North Coast Brewing (Dana Meyer, dana@newshipper.com)");
    expect(email.text).toContain("New account created through the public quote page.");
    expect(email.text).toContain("- HAZMAT (UN1993 · Flammable liquids, n.o.s. · Class 3)");
    expect(email.text).toContain("/admin/quotes/rfq-9");
    expect(email.text).not.toContain("—");
  });

  it("team alert without a note matches the signed-in portal shape", () => {
    const email = composeRfqTeamAlert({
      orgName: "Org A",
      requesterName: "Shipper A",
      requesterEmail: "a@shipper-a.com",
      requestId: "rfq-1",
      rfq: rfq(),
    });
    expect(email.text).toContain("Org A (Shipper A, a@shipper-a.com) submitted a quote request.");
    expect(email.text).not.toContain("public quote page");
    expect(email.text).toContain("- Weight: 38000 lbs");
  });

  it("welcome email gives one clear request link, a founder sign-off, and no em-dash", () => {
    const email = composeGuestWelcome({
      to: "dana@newshipper.com",
      name: "Dana Meyer",
      requestId: "rfq-9",
    });
    expect(email.subject).toBe("We received your Peer Freight quote request");
    expect(email.text).toContain("Hi Dana!");
    expect(email.text).toContain("/quotes/rfq-9");
    expect(email.text).not.toContain("/login");
    expect(email.text).not.toContain("price lands");
    expect(email.text).toContain("Best,\nAaron and Felix\nPeer Freight");
    expect(email.text.match(/https?:\/\//g)).toHaveLength(1);
    expect(email.text).not.toContain("—");
  });
});
