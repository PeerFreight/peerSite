// Delay / exception surfacing: one live delay per load, set/clear history
// in events, auto-clear when the freight leaves the road, and the same org
// and admin boundaries as every other load write.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import {
  bookLoad,
  clearLoadDelay,
  sendQuote,
  setLoadDelay,
  setLoadStatus,
} from "../lib/portal/admin-queries";
import { createQuoteRequest, getLoadDetail, listLoads, type PortalDb } from "../lib/portal/queries";
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

async function makeBookedLoad() {
  const requestId = await createQuoteRequest(db, "user-a", "org-a", rfq());
  const { quoteId } = await sendQuote(db, admin, requestId, {
    allInRateUsd: "1850.00",
    serviceDescription: "Dry van 53', door to door.",
    exclusions: null,
    validUntil: null,
    note: null,
  });
  return bookLoad(db, admin, quoteId);
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

describe("set and clear", () => {
  it("flags the delay, exposes it to the shipper, and events both directions", async () => {
    const { loadId } = await makeBookedLoad();
    await setLoadStatus(db, admin, loadId, "dispatched");
    await setLoadStatus(db, admin, loadId, "in_transit");

    const result = await setLoadDelay(db, admin, loadId, {
      reason: "Breakdown near Sacramento",
      revisedDeliveryDate: "2026-08-09",
    });
    expect(result.reason).toBe("Breakdown near Sacramento");

    const detail = await getLoadDetail(db, "user-a", "org-a", loadId);
    expect(detail!.load.delayedAt).toBeInstanceOf(Date);
    expect(detail!.load.delayReason).toBe("Breakdown near Sacramento");
    expect(detail!.load.revisedDeliveryDate).toBe("2026-08-09");
    const delayed = detail!.events.find((e) => e.eventType === "load_delayed");
    expect(delayed?.payload).toMatchObject({
      reason: "Breakdown near Sacramento",
      revisedDeliveryDate: "2026-08-09",
    });

    // The list rows carry the flag too (badges on /loads and the dashboard).
    const rows = await listLoads(db, "user-a", "org-a");
    expect(rows.find((l) => l.id === loadId)?.delayedAt).toBeInstanceOf(Date);

    await clearLoadDelay(db, admin, loadId);
    const cleared = await getLoadDetail(db, "user-a", "org-a", loadId);
    expect(cleared!.load.delayedAt).toBeNull();
    expect(cleared!.load.delayReason).toBeNull();
    expect(cleared!.load.revisedDeliveryDate).toBeNull();
    expect(cleared!.events.map((e) => e.eventType)).toContain("load_delay_cleared");
  });

  it("clearing without a live delay is an error; a second set updates in place", async () => {
    const { loadId } = await makeBookedLoad();
    await expect(clearLoadDelay(db, admin, loadId)).rejects.toThrow(/not flagged/);
    await setLoadDelay(db, admin, loadId, { reason: "Dock congestion" });
    await setLoadDelay(db, admin, loadId, { reason: "Dock congestion, day 2", revisedDeliveryDate: "2026-08-08" });
    const detail = await getLoadDetail(db, "user-a", "org-a", loadId);
    expect(detail!.load.delayReason).toBe("Dock congestion, day 2");
  });
});

describe("lifecycle interaction", () => {
  it("delivery auto-clears the delay in the same transition", async () => {
    const { loadId } = await makeBookedLoad();
    await setLoadStatus(db, admin, loadId, "dispatched");
    await setLoadStatus(db, admin, loadId, "in_transit");
    await setLoadDelay(db, admin, loadId, { reason: "Pass closed overnight" });
    await setLoadStatus(db, admin, loadId, "delivered");
    const detail = await getLoadDetail(db, "user-a", "org-a", loadId);
    expect(detail!.load.status).toBe("delivered");
    expect(detail!.load.delayedAt).toBeNull();
    expect(detail!.load.delayReason).toBeNull();
  });

  it("cancel auto-clears too", async () => {
    const { loadId } = await makeBookedLoad();
    await setLoadDelay(db, admin, loadId, { reason: "Shipper hold" });
    await setLoadStatus(db, admin, loadId, "cancelled");
    const detail = await getLoadDetail(db, "user-a", "org-a", loadId);
    expect(detail!.load.delayedAt).toBeNull();
  });

  it("rejects flagging freight that is already off the road", async () => {
    const { loadId } = await makeBookedLoad();
    await setLoadStatus(db, admin, loadId, "dispatched");
    await setLoadStatus(db, admin, loadId, "in_transit");
    await setLoadStatus(db, admin, loadId, "delivered");
    await expect(setLoadDelay(db, admin, loadId, { reason: "x" })).rejects.toThrow(/delivered/);
  });
});

describe("boundaries", () => {
  it("requires the admin role and respects the org wall", async () => {
    const { loadId } = await makeBookedLoad();
    await expect(setLoadDelay(db, notAdmin, loadId, { reason: "x" })).rejects.toThrow();
    await expect(clearLoadDelay(db, notAdmin, loadId)).rejects.toThrow();
    await setLoadDelay(db, admin, loadId, { reason: "Real delay" });
    expect(await getLoadDetail(db, "user-b", "org-b", loadId)).toBeNull();
    await expect(getLoadDetail(db, "user-b", "org-a", loadId)).rejects.toThrow();
  });
});
