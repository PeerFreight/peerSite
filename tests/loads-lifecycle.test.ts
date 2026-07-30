// CI tests for Phases 3–5: booking, the load status machine, documents, and
// carrier assignment respect the org boundary, the admin role, and the
// shipper-visibility rules. Runs against an in-memory PGlite Postgres with
// the real generated migrations applied.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { mkdtempSync } from "node:fs";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import {
  addDocument,
  bookLoad,
  getLoadForAdmin,
  listLoadsForAdmin,
  sendQuote,
  setDocumentVisibility,
  setLoadStatus,
  upsertCarrierAssignment,
} from "../lib/portal/admin-queries";
import {
  createQuoteRequest,
  getDocumentForUser,
  getLoadDetail,
  getQuoteRequestDetail,
  listLoads,
  type PortalDb,
} from "../lib/portal/queries";
import type { RfqInput } from "../lib/portal/rfq";

let db: PortalDb;

const admin = { id: "user-admin", email: "aaron@peer-freight.com", emailVerified: true };
const notAdmin = { id: "user-a", email: "a@shipper-a.com", emailVerified: true };

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

async function makeQuotedRequest(orgUser: string, org: string) {
  const requestId = await createQuoteRequest(db, orgUser, org, rfq());
  const { quoteId } = await sendQuote(db, admin, requestId, {
    allInRateUsd: "1850.00",
    serviceDescription: "Dry van 53', door to door.",
    exclusions: null,
    validUntil: null,
  });
  return { requestId, quoteId };
}

let loadA: string;
let quoteA: string;
let requestA: string;

beforeAll(async () => {
  process.env.PORTAL_DOCS_DIR = mkdtempSync(join(tmpdir(), "peer-docs-"));
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

  const made = await makeQuotedRequest("user-a", "org-a");
  requestA = made.requestId;
  quoteA = made.quoteId;
  const booked = await bookLoad(db, admin, quoteA);
  loadA = booked.loadId;
});

describe("booking", () => {
  it("books a PEER-nnnn load snapshotting the RFQ and recording acceptance", async () => {
    const detail = await getLoadDetail(db, "user-a", "org-a", loadA);
    expect(detail).not.toBeNull();
    expect(detail!.load.reference).toMatch(/^PEER-\d{4,}$/);
    expect(detail!.load.status).toBe("booked");
    expect(detail!.load.commodity).toBe("Packaged beer, cases on pallets");
    expect(detail!.load.allInRateUsd).toBe("1850.00");
    const types = detail!.events.map((e) => e.eventType);
    expect(types).toContain("quote_accepted");
    expect(types).toContain("load_booked");
    const rfqDetail = await getQuoteRequestDetail(db, "user-a", "org-a", requestA);
    expect(rfqDetail?.request.status).toBe("accepted");
    expect(rfqDetail?.quotes[0].status).toBe("accepted");
  });

  it("rejects double-booking the same quote and non-admin booking", async () => {
    await expect(bookLoad(db, admin, quoteA)).rejects.toThrow(/already booked/);
    const another = await makeQuotedRequest("user-a", "org-a");
    await expect(bookLoad(db, notAdmin, another.quoteId)).rejects.toThrow();
  });

  it("increments the reference sequence per booking", async () => {
    const another = await makeQuotedRequest("user-a", "org-a");
    const booked = await bookLoad(db, admin, another.quoteId);
    const a = Number(booked.reference.split("-")[1]);
    expect(a).toBeGreaterThanOrEqual(1002);
  });
});

describe("load org isolation", () => {
  it("hides org A's loads from org B through every query path", async () => {
    const forA = await listLoads(db, "user-a", "org-a");
    expect(forA.map((l) => l.id)).toContain(loadA);
    const forB = await listLoads(db, "user-b", "org-b");
    expect(forB).toHaveLength(0);
    await expect(listLoads(db, "user-b", "org-a")).rejects.toThrow();
    expect(await getLoadDetail(db, "user-b", "org-b", loadA)).toBeNull();
    await expect(getLoadDetail(db, "user-b", "org-a", loadA)).rejects.toThrow();
  });

  it("admin queries require the admin role", async () => {
    await expect(listLoadsForAdmin(db, notAdmin)).rejects.toThrow();
    await expect(getLoadForAdmin(db, notAdmin, loadA)).rejects.toThrow();
    await expect(setLoadStatus(db, notAdmin, loadA, "dispatched")).rejects.toThrow();
  });
});

describe("status lifecycle", () => {
  it("rejects illegal jumps and walks the legal path", async () => {
    await expect(setLoadStatus(db, admin, loadA, "in_transit")).rejects.toThrow();
    await expect(setLoadStatus(db, admin, loadA, "closed")).rejects.toThrow();
    await setLoadStatus(db, admin, loadA, "dispatched");
    await setLoadStatus(db, admin, loadA, "in_transit");
    await setLoadStatus(db, admin, loadA, "delivered");
    // no cancel after delivery; the money path is the only way out
    await expect(setLoadStatus(db, admin, loadA, "cancelled")).rejects.toThrow();
    await setLoadStatus(db, admin, loadA, "invoiced");
    await setLoadStatus(db, admin, loadA, "closed");
    const detail = await getLoadDetail(db, "user-a", "org-a", loadA);
    expect(detail!.load.status).toBe("closed");
    const types = detail!.events.map((e) => e.eventType);
    for (const t of [
      "load_dispatched",
      "load_in_transit",
      "load_delivered",
      "load_invoiced",
      "load_closed",
    ]) {
      expect(types).toContain(t);
    }
  });

  it("allows cancel while the freight is still moving", async () => {
    const another = await makeQuotedRequest("user-a", "org-a");
    const booked = await bookLoad(db, admin, another.quoteId);
    await setLoadStatus(db, admin, booked.loadId, "cancelled");
    const detail = await getLoadDetail(db, "user-a", "org-a", booked.loadId);
    expect(detail!.load.status).toBe("cancelled");
    await expect(setLoadStatus(db, admin, booked.loadId, "dispatched")).rejects.toThrow();
  });
});

describe("documents", () => {
  let internalDoc: string;
  let sharedDoc: string;

  it("separates internal uploads from shipper-shared documents", async () => {
    const internal = await addDocument(db, admin, loadA, {
      type: "rate_confirmation",
      filename: "carrier-ratecon-internal.pdf",
      contentType: "application/pdf",
      sizeBytes: 1000,
      storagePath: "org-a/x/internal.pdf",
      visibleToShipper: false,
    });
    internalDoc = internal.documentId;
    const shared = await addDocument(db, admin, loadA, {
      type: "bol",
      filename: "bol-signed.pdf",
      contentType: "application/pdf",
      sizeBytes: 2000,
      storagePath: "org-a/x/bol.pdf",
      visibleToShipper: true,
    });
    sharedDoc = shared.documentId;

    const detail = await getLoadDetail(db, "user-a", "org-a", loadA);
    expect(detail!.documents.map((d) => d.id)).toEqual([sharedDoc]);
    // the internal upload never reaches the shipper timeline either
    expect(detail!.events.map((e) => e.eventType)).not.toContain("document_uploaded_internal");
    // but the admin trail keeps everything
    const adminDetail = await getLoadForAdmin(db, admin, loadA);
    expect(adminDetail!.documents).toHaveLength(2);
    expect(adminDetail!.events.map((e) => e.eventType)).toContain("document_uploaded_internal");
  });

  it("gates downloads on membership and visibility", async () => {
    expect(await getDocumentForUser(db, "user-a", "org-a", sharedDoc)).not.toBeNull();
    expect(await getDocumentForUser(db, "user-a", "org-a", internalDoc)).toBeNull();
    expect(await getDocumentForUser(db, "user-b", "org-b", sharedDoc)).toBeNull();
    await expect(getDocumentForUser(db, "user-b", "org-a", sharedDoc)).rejects.toThrow();
    await expect(addDocument(db, notAdmin, loadA, {
      type: "other",
      filename: "x",
      contentType: "text/plain",
      sizeBytes: 1,
      storagePath: "y",
      visibleToShipper: true,
    })).rejects.toThrow();
  });

  it("sharing later makes the document visible", async () => {
    expect(await getDocumentForUser(db, "user-a", "org-a", internalDoc)).toBeNull();
    await setDocumentVisibility(db, admin, internalDoc, true);
    expect(await getDocumentForUser(db, "user-a", "org-a", internalDoc)).not.toBeNull();
    await expect(setDocumentVisibility(db, notAdmin, internalDoc, false)).rejects.toThrow();
  });
});

describe("carrier assignment", () => {
  let loadC: string;

  beforeAll(async () => {
    const made = await makeQuotedRequest("user-a", "org-a");
    const booked = await bookLoad(db, admin, made.quoteId);
    loadC = booked.loadId;
  });

  it("stays hidden from the shipper until marked visible", async () => {
    await upsertCarrierAssignment(db, admin, loadC, {
      carrierName: "Sierra Haulage LLC",
      mcNumber: "MC-998877",
      driverName: "R. Alvarez",
      driverPhone: "(775) 555-0142",
      truckNumber: "204",
      trailerNumber: "5311",
      trackingUrl: "https://track.example.com/abc",
      visibleToShipper: false,
    });
    const hidden = await getLoadDetail(db, "user-a", "org-a", loadC);
    expect(hidden!.carrier).toBeNull();
    expect(hidden!.events.map((e) => e.eventType)).not.toContain("carrier_assigned");

    await upsertCarrierAssignment(db, admin, loadC, {
      carrierName: "Sierra Haulage LLC",
      mcNumber: "MC-998877",
      driverName: "R. Alvarez",
      driverPhone: "(775) 555-0142",
      truckNumber: "204",
      trailerNumber: "5311",
      trackingUrl: "https://track.example.com/abc",
      visibleToShipper: true,
    });
    const visible = await getLoadDetail(db, "user-a", "org-a", loadC);
    expect(visible!.carrier?.carrierName).toBe("Sierra Haulage LLC");
    expect(visible!.carrier?.trackingUrl).toBe("https://track.example.com/abc");

    // one assignment per load: the second call updated in place
    const adminDetail = await getLoadForAdmin(db, admin, loadC);
    expect(adminDetail!.events.map((e) => e.eventType)).toContain("carrier_updated");
  });

  it("respects org boundary and admin role", async () => {
    const forB = await getLoadDetail(db, "user-b", "org-b", loadC);
    expect(forB).toBeNull();
    await expect(
      upsertCarrierAssignment(db, notAdmin, loadC, {
        carrierName: "Nope",
        mcNumber: null,
        driverName: null,
        driverPhone: null,
        truckNumber: null,
        trailerNumber: null,
        trackingUrl: null,
        visibleToShipper: true,
      }),
    ).rejects.toThrow();
  });
});
