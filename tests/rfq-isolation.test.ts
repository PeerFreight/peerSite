// CI tests for Phase 2: quote requests, quotes, and events respect the org
// boundary; admin queries require the admin role; the events table is
// append-only at the database level. Runs against an in-memory PGlite
// Postgres with the real generated migrations applied.
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import {
  getQuoteRequestForAdmin,
  listOpenQuoteRequests,
  requestInfo,
  sendQuote,
} from "../lib/portal/admin-queries";
import {
  createQuoteRequest,
  declineQuote,
  getQuoteRequestDetail,
  listQuoteRequests,
  type PortalDb,
} from "../lib/portal/queries";
import type { RfqInput } from "../lib/portal/rfq";

let db: PortalDb;

const admin = { id: "user-admin", email: "aaron@peer-freight.com", emailVerified: true };
const notAdmin = { id: "user-a", email: "a@shipper-a.com", emailVerified: true };
const unverifiedFounderDomain = { id: "user-x", email: "mallory@peer-freight.com", emailVerified: false };

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
    referenceNumbers: [{ label: "PO", value: "PO-1234" }],
    targetRateUsd: null,
    frequency: "one_time",
    notes: null,
    ...overrides,
  };
}

let requestA: string;

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
    { id: "user-admin", name: "Aaron", email: "aaron@peer-freight.com", emailVerified: true },
  ]);
  await d.insert(schema.organization).values([
    { id: "org-a", name: "Org A", slug: "org-a" },
    { id: "org-b", name: "Org B", slug: "org-b" },
  ]);
  await d.insert(schema.member).values([
    { id: "m-a", organizationId: "org-a", userId: "user-a", role: "owner" },
    { id: "m-b", organizationId: "org-b", userId: "user-b", role: "owner" },
  ]);

  requestA = await createQuoteRequest(db, "user-a", "org-a", rfq());
});

describe("quote request org isolation", () => {
  it("refuses to create an RFQ across the org boundary", async () => {
    await expect(createQuoteRequest(db, "user-b", "org-a", rfq())).rejects.toThrow();
  });

  it("lists RFQs only for members of the org", async () => {
    const forA = await listQuoteRequests(db, "user-a", "org-a");
    expect(forA.map((r) => r.id)).toContain(requestA);
    const forB = await listQuoteRequests(db, "user-b", "org-b");
    expect(forB).toHaveLength(0);
    await expect(listQuoteRequests(db, "user-b", "org-a")).rejects.toThrow();
  });

  it("hides another org's RFQ detail even with a valid id", async () => {
    const own = await getQuoteRequestDetail(db, "user-a", "org-a", requestA);
    expect(own?.request.id).toBe(requestA);
    // user-b passes their own org but someone else's request id: not found.
    expect(await getQuoteRequestDetail(db, "user-b", "org-b", requestA)).toBeNull();
    // and passing the foreign org id fails membership outright.
    await expect(getQuoteRequestDetail(db, "user-b", "org-a", requestA)).rejects.toThrow();
  });

  it("records the submission on the append-only timeline", async () => {
    const detail = await getQuoteRequestDetail(db, "user-a", "org-a", requestA);
    expect(detail?.events.map((e) => e.eventType)).toContain("rfq_submitted");
  });
});

describe("admin role gate", () => {
  it("rejects non-admins and unverified founder-domain accounts", async () => {
    await expect(listOpenQuoteRequests(db, notAdmin)).rejects.toThrow();
    await expect(listOpenQuoteRequests(db, unverifiedFounderDomain)).rejects.toThrow();
    await expect(getQuoteRequestForAdmin(db, notAdmin, requestA)).rejects.toThrow();
    await expect(sendQuote(db, notAdmin, requestA, {
      allInRateUsd: "1850.00",
      serviceDescription: "x",
      exclusions: null,
      validUntil: null,
    })).rejects.toThrow();
    await expect(requestInfo(db, notAdmin, requestA, "?")).rejects.toThrow();
  });

  it("admin sees the cross-org queue oldest-first", async () => {
    const requestB = await createQuoteRequest(db, "user-b", "org-b", rfq({ originCity: "Fresno" }));
    const open = await listOpenQuoteRequests(db, admin);
    const ids = open.map((r) => r.id);
    expect(ids).toContain(requestA);
    expect(ids).toContain(requestB);
    expect(ids.indexOf(requestA)).toBeLessThan(ids.indexOf(requestB));
  });
});

describe("quoting flow", () => {
  it("needs-info marks the request and logs the ask", async () => {
    await requestInfo(db, admin, requestA, "Confirm the pickup address and hours.");
    const detail = await getQuoteRequestDetail(db, "user-a", "org-a", requestA);
    expect(detail?.request.status).toBe("needs_info");
    expect(detail?.request.needsInfoMessage).toContain("pickup address");
    expect(detail?.events.map((e) => e.eventType)).toContain("needs_info");
  });

  it("send-quote creates a shipper-visible quote and only for its org", async () => {
    await sendQuote(db, admin, requestA, {
      allInRateUsd: "1850.00",
      serviceDescription: "Dry van 53', door to door.",
      exclusions: "Detention after 2 hours",
      validUntil: null,
    });
    const detail = await getQuoteRequestDetail(db, "user-a", "org-a", requestA);
    expect(detail?.request.status).toBe("quoted");
    expect(detail?.quotes).toHaveLength(1);
    expect(detail?.quotes[0].allInRateUsd).toBe("1850.00");
    // org B still sees nothing anywhere.
    expect(await getQuoteRequestDetail(db, "user-b", "org-b", requestA)).toBeNull();
    const forB = await listQuoteRequests(db, "user-b", "org-b");
    expect(forB.map((r) => r.id)).not.toContain(requestA);
  });

  it("only the owning org can decline its quote", async () => {
    const detail = await getQuoteRequestDetail(db, "user-a", "org-a", requestA);
    const quoteId = detail!.quotes[0].id;
    await expect(declineQuote(db, "user-b", "org-b", quoteId)).rejects.toThrow();
    await declineQuote(db, "user-a", "org-a", quoteId);
    const after = await getQuoteRequestDetail(db, "user-a", "org-a", requestA);
    expect(after?.request.status).toBe("declined");
    expect(after?.quotes[0].status).toBe("declined");
    expect(after?.events.map((e) => e.eventType)).toContain("quote_declined");
  });
});

describe("events are append-only", () => {
  it("rejects UPDATE and DELETE at the database", async () => {
    const rows = await db.select().from(schema.events).limit(1);
    expect(rows.length).toBeGreaterThan(0);
    const original = rows[0];
    await expect(
      db.update(schema.events).set({ eventType: "rewritten" }).where(eq(schema.events.id, original.id)),
    ).rejects.toThrow();
    await expect(
      db.delete(schema.events).where(eq(schema.events.id, original.id)),
    ).rejects.toThrow();
    const after = await db.select().from(schema.events).where(eq(schema.events.id, original.id));
    expect(after).toHaveLength(1);
    expect(after[0].eventType).toBe(original.eventType);
  });
});
