// Invoices as data: INV-nnnn sequence, sell-side amount defaulting, the
// delivered → invoiced auto-transition, one invoice per load, mark-paid,
// and the same role/org walls as everything else.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import {
  bookLoad,
  createInvoice,
  getLoadForAdmin,
  markInvoicePaid,
  sendQuote,
  setLoadStatus,
} from "../lib/portal/admin-queries";
import { getInvoiceForLoad, listInvoices } from "../lib/portal/invoices";
import { createQuoteRequest, getLoadDetail, type PortalDb } from "../lib/portal/queries";
import type { RfqInput } from "../lib/portal/rfq";

let db: PortalDb;

const admin = { id: "user-admin", email: "aaron@peer-freight.com", emailVerified: true };
const notAdmin = { id: "user-a", email: "a@shipper-a.com", emailVerified: true };

function rfq(): RfqInput {
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
    declaredValueUsd: null,
    equipment: "dry_van_53",
    temperatureF: null,
    equipmentNotes: null,
    hazmat: false,
    hazmatDetails: null,
    accessorials: [],
    referenceNumbers: [],
    targetRateUsd: null,
    frequency: "one_time",
    notes: null,
  };
}

async function makeLoad(status: "in_transit" | "delivered" = "delivered") {
  const requestId = await createQuoteRequest(db, "user-a", "org-a", rfq());
  const { quoteId } = await sendQuote(db, admin, requestId, {
    allInRateUsd: "1850.00",
    serviceDescription: "Dry van 53', door to door.",
    exclusions: null,
    validUntil: null,
    note: null,
  });
  const booked = await bookLoad(db, admin, quoteId);
  await setLoadStatus(db, admin, booked.loadId, "dispatched");
  await setLoadStatus(db, admin, booked.loadId, "in_transit");
  if (status === "delivered") await setLoadStatus(db, admin, booked.loadId, "delivered");
  return booked;
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
});

describe("createInvoice", () => {
  it("defaults the amount to the agreed rate and walks delivered → invoiced with both events", async () => {
    const { loadId } = await makeLoad("delivered");
    const result = await createInvoice(db, admin, loadId, { dueDate: "2026-09-05" });
    expect(result.number).toMatch(/^INV-\d{4,}$/);
    expect(result.amountUsd).toBe("1850.00");

    const detail = await getLoadDetail(db, "user-a", "org-a", loadId);
    expect(detail!.load.status).toBe("invoiced");
    const types = detail!.events.map((e) => e.eventType);
    expect(types).toContain("invoice_created");
    expect(types).toContain("load_invoiced");

    const invoice = await getInvoiceForLoad(db, "user-a", "org-a", loadId);
    expect(invoice?.status).toBe("open");
    expect(invoice?.dueDate).toBe("2026-09-05");
  });

  it("increments the INV sequence and takes an explicit amount", async () => {
    const a = await makeLoad("delivered");
    const b = await makeLoad("delivered");
    const invA = await createInvoice(db, admin, a.loadId, { dueDate: "2026-09-05" });
    const invB = await createInvoice(db, admin, b.loadId, {
      amountUsd: "2000.00",
      dueDate: "2026-09-10",
    });
    expect(Number(invB.number.split("-")[1])).toBe(Number(invA.number.split("-")[1]) + 1);
    expect(invB.amountUsd).toBe("2000.00");
  });

  it("enforces one invoice per load and the delivered|invoiced guard", async () => {
    const { loadId } = await makeLoad("delivered");
    await createInvoice(db, admin, loadId, { dueDate: "2026-09-05" });
    await expect(createInvoice(db, admin, loadId, { dueDate: "2026-09-06" })).rejects.toThrow(
      /already has invoice/,
    );
    const moving = await makeLoad("in_transit");
    await expect(createInvoice(db, admin, moving.loadId, { dueDate: "2026-09-05" })).rejects.toThrow(
      /cannot be invoiced/,
    );
  });

  it("rejects a documentId from another load", async () => {
    const { loadId } = await makeLoad("delivered");
    await expect(
      createInvoice(db, admin, loadId, { dueDate: "2026-09-05", documentId: "not-a-doc" }),
    ).rejects.toThrow(/does not belong/);
  });
});

describe("markInvoicePaid", () => {
  it("accepts the INV number (case-insensitive), stamps paidAt, events it, and rejects double-pay", async () => {
    const { loadId } = await makeLoad("delivered");
    const created = await createInvoice(db, admin, loadId, { dueDate: "2026-09-05" });
    const paid = await markInvoicePaid(db, admin, created.number.toLowerCase());
    expect(paid.number).toBe(created.number);

    const invoice = await getInvoiceForLoad(db, "user-a", "org-a", loadId);
    expect(invoice?.status).toBe("paid");
    expect(invoice?.paidAt).toBeInstanceOf(Date);
    const adminDetail = await getLoadForAdmin(db, admin, loadId);
    expect(adminDetail!.events.map((e) => e.eventType)).toContain("invoice_paid");

    await expect(markInvoicePaid(db, admin, created.number)).rejects.toThrow(/already paid/);
    await expect(markInvoicePaid(db, admin, "INV-999999")).rejects.toThrow(/not found/);
  });
});

describe("boundaries", () => {
  it("keeps invoices org-scoped and admin-written", async () => {
    const { loadId } = await makeLoad("delivered");
    await expect(createInvoice(db, notAdmin, loadId, { dueDate: "2026-09-05" })).rejects.toThrow();
    await createInvoice(db, admin, loadId, { dueDate: "2026-09-05" });
    await expect(markInvoicePaid(db, notAdmin, "INV-1001")).rejects.toThrow();

    const mine = await listInvoices(db, "user-a", "org-a");
    expect(mine.length).toBeGreaterThan(0);
    expect(mine[0].reference).toMatch(/^PEER-/);
    const theirs = await listInvoices(db, "user-b", "org-b");
    expect(theirs).toHaveLength(0);
    await expect(listInvoices(db, "user-b", "org-a")).rejects.toThrow();
    expect(await getInvoiceForLoad(db, "user-b", "org-b", loadId)).toBeNull();
  });
});
