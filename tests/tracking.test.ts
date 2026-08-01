// Live tracking (Phase 6): session lifecycle + event rows, ping idempotency,
// the public token's privacy boundary (exact key set, revoke/expiry/cancel),
// and org isolation. Runs against in-memory PGlite with the real migrations,
// stub provider (no PORTAL_MACROPOINT_ID in the test env → no network).
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq } from "drizzle-orm";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { bookLoad, sendQuote, setLoadStatus, upsertCarrierAssignment } from "../lib/portal/admin-queries";
import {
  createQuoteRequest,
  getPublicTracking,
  getTrackingForLoad,
  type PortalDb,
} from "../lib/portal/queries";
import { normalizePhone } from "../lib/portal/tracking";
import {
  expirePublicLinkOnDelivery,
  getTrackingForAdmin,
  recordPing,
  revokePublicLink,
  startTracking,
  stopTracking,
} from "../lib/portal/tracking-queries";
import type { NormalizedPing } from "../lib/tracking/provider";
import type { RfqInput } from "../lib/portal/rfq";

let db: PortalDb;

const admin = { id: "user-admin", email: "aaron@peer-freight.com", emailVerified: true };
const notAdmin = { id: "user-a", email: "a@shipper-a.com", emailVerified: true };

function rfq(): RfqInput {
  return {
    originAddress: "123 Brewery Way",
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
    accessorials: [],
    referenceNumbers: [],
    targetRateUsd: null,
    frequency: "one_time",
    notes: null,
  };
}

async function makeBookedLoad(withPhone = "(555) 555-0100") {
  const requestId = await createQuoteRequest(db, "user-a", "org-a", rfq());
  const { quoteId } = await sendQuote(db, admin, requestId, {
    allInRateUsd: "1850.00",
    serviceDescription: "Dry van 53', door to door.",
    exclusions: null,
    validUntil: null,
  });
  const { loadId } = await bookLoad(db, admin, quoteId);
  if (withPhone) {
    await upsertCarrierAssignment(db, admin, loadId, {
      carrierName: "Sierra Haulers LLC",
      mcNumber: "MC-123456",
      driverName: "Danny",
      driverPhone: withPhone,
      truckNumber: null,
      trailerNumber: null,
      trackingUrl: null,
      visibleToShipper: true,
    });
  }
  return loadId;
}

function ping(overrides: Partial<NormalizedPing> = {}): NormalizedPing {
  return {
    kind: "ping",
    lat: 38.2324,
    lng: -122.6367,
    recordedAt: new Date("2026-08-05T18:00:00Z"),
    city: "Petaluma",
    state: "CA",
    etaAt: new Date("2026-08-06T20:00:00Z"),
    providerStatus: "in_transit",
    providerEventId: "evt-1",
    source: "sim",
    ...overrides,
  };
}

async function loadEvents(loadId: string) {
  return db.select().from(schema.events).where(eq(schema.events.loadId, loadId));
}

beforeAll(async () => {
  delete process.env.PORTAL_MACROPOINT_ID; // stub provider, no network
  delete process.env.PORTAL_GMAPS_SERVER_KEY; // geocode short-circuits to null
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

describe("normalizePhone", () => {
  it("normalizes US formats to E.164 and hard-fails garbage", () => {
    expect(normalizePhone("(555) 555-0100")).toBe("+15555550100");
    expect(normalizePhone("1-555-555-0100")).toBe("+15555550100");
    expect(normalizePhone("+447911123456")).toBe("+447911123456");
    expect(() => normalizePhone("555-0100")).toThrow();
    expect(() => normalizePhone("not a phone")).toThrow();
    expect(() => normalizePhone("+12")).toThrow();
  });
});

describe("session lifecycle", () => {
  it("starts a stub session with tokens, geocode-less pins, and an event row", async () => {
    const loadId = await makeBookedLoad();
    const { sessionId, publicToken, provider } = await startTracking(db, admin, loadId, {
      intervalMinutes: 30,
    });
    expect(provider).toBe("stub");
    expect(publicToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    const tracking = await getTrackingForAdmin(db, admin, loadId);
    expect(tracking?.session.id).toBe(sessionId);
    expect(tracking?.session.status).toBe("requested");
    expect(tracking?.session.driverPhone).toBe("+15555550100");
    expect(tracking?.session.externalOrderId).toBe(`stub-${sessionId}`);
    const types = (await loadEvents(loadId)).map((e) => e.eventType);
    expect(types).toContain("tracking_started");
  });

  it("refuses a second live session, a missing driver phone, and non-admins", async () => {
    const loadId = await makeBookedLoad();
    await startTracking(db, admin, loadId, { intervalMinutes: 30 });
    await expect(startTracking(db, admin, loadId, { intervalMinutes: 30 })).rejects.toThrow(
      /already has a live/,
    );
    const bare = await makeBookedLoad("");
    await expect(startTracking(db, admin, bare, { intervalMinutes: 30 })).rejects.toThrow(
      /driver phone/,
    );
    await expect(
      startTracking(db, notAdmin, loadId, { intervalMinutes: 30 }),
    ).rejects.toThrow();
  });

  it("hard-fails a bad driver phone before touching the provider", async () => {
    const loadId = await makeBookedLoad("12345");
    await expect(startTracking(db, admin, loadId, { intervalMinutes: 30 })).rejects.toThrow();
    expect(await getTrackingForAdmin(db, admin, loadId)).toBeNull();
  });

  it("only tracks a booked/dispatched/in_transit load", async () => {
    const loadId = await makeBookedLoad();
    await setLoadStatus(db, admin, loadId, "dispatched");
    await setLoadStatus(db, admin, loadId, "in_transit");
    await setLoadStatus(db, admin, loadId, "delivered");
    await expect(startTracking(db, admin, loadId, { intervalMinutes: 30 })).rejects.toThrow(
      /delivered/,
    );
  });

  it("stops a session and logs the event", async () => {
    const loadId = await makeBookedLoad();
    await startTracking(db, admin, loadId, { intervalMinutes: 30 });
    await stopTracking(db, admin, loadId);
    const tracking = await getTrackingForAdmin(db, admin, loadId);
    expect(tracking?.session.status).toBe("stopped");
    expect(tracking?.session.stoppedAt).not.toBeNull();
    const types = (await loadEvents(loadId)).map((e) => e.eventType);
    expect(types).toContain("tracking_stopped");
    await expect(stopTracking(db, admin, loadId)).rejects.toThrow(/No live/);
  });
});

describe("ping recording", () => {
  it("is idempotent on provider event id and flips requested → active", async () => {
    const loadId = await makeBookedLoad();
    await startTracking(db, admin, loadId, { intervalMinutes: 30 });
    const tracking = await getTrackingForAdmin(db, admin, loadId);
    const session = tracking!.session;

    expect((await recordPing(db, session, ping())).inserted).toBe(true);
    expect((await recordPing(db, session, ping())).inserted).toBe(false); // retry absorbed
    const after = await getTrackingForAdmin(db, admin, loadId);
    expect(after?.pings).toHaveLength(1);
    expect(after?.session.status).toBe("active");
    expect(after?.session.lastPingAt?.toISOString()).toBe("2026-08-05T18:00:00.000Z");
  });

  it("dedupes event-id-less pings on (recordedAt, lat, lng) and keeps distinct ones", async () => {
    const loadId = await makeBookedLoad();
    await startTracking(db, admin, loadId, { intervalMinutes: 30 });
    const session = (await getTrackingForAdmin(db, admin, loadId))!.session;

    const anonymous = ping({ providerEventId: null });
    expect((await recordPing(db, session, anonymous)).inserted).toBe(true);
    expect((await recordPing(db, session, anonymous)).inserted).toBe(false);
    expect(
      (
        await recordPing(
          db,
          session,
          ping({ providerEventId: null, recordedAt: new Date("2026-08-05T18:30:00Z"), lat: 38.5 }),
        )
      ).inserted,
    ).toBe(true);
    const after = await getTrackingForAdmin(db, admin, loadId);
    expect(after?.pings).toHaveLength(2);
    // lastPingAt is the max recordedAt, not the last write
    expect(after?.session.lastPingAt?.toISOString()).toBe("2026-08-05T18:30:00.000Z");
  });
});

describe("public tracking projection", () => {
  it("exposes exactly the narrow key set — no addresses, driver, or rate", async () => {
    const loadId = await makeBookedLoad();
    await startTracking(db, admin, loadId, { intervalMinutes: 30 });
    const session = (await getTrackingForAdmin(db, admin, loadId))!.session;
    await recordPing(db, session, ping());

    const payload = await getPublicTracking(db, session.publicToken);
    expect(payload).not.toBeNull();
    // The privacy contract: widening this set is a deliberate decision, not
    // a drive-by. NEVER add address lines, driver contact, or rates.
    expect(Object.keys(payload!).sort()).toEqual([
      "destCity",
      "destLat",
      "destLng",
      "destState",
      "etaAt",
      "lastPingAt",
      "loadStatus",
      "originCity",
      "originLat",
      "originLng",
      "originState",
      "pings",
      "reference",
    ]);
    expect(Object.keys(payload!.pings[0]).sort()).toEqual(["lat", "lng", "recordedAt"]);
    expect(payload!.reference).toMatch(/^PEER-\d+/);
    expect(payload!.loadStatus).toBe("booked");
    expect(payload!.etaAt).toBe("2026-08-06T20:00:00.000Z");
    expect(JSON.stringify(payload)).not.toContain("Brewery"); // no address leak
    expect(JSON.stringify(payload)).not.toContain("5550100");
    expect(JSON.stringify(payload)).not.toContain("1850");
  });

  it("dies on revoke (old token) while the rotated token keeps working", async () => {
    const loadId = await makeBookedLoad();
    await startTracking(db, admin, loadId, { intervalMinutes: 30 });
    const session = (await getTrackingForAdmin(db, admin, loadId))!.session;
    const oldToken = session.publicToken;
    expect(await getPublicTracking(db, oldToken)).not.toBeNull();

    const { publicToken: newToken } = await revokePublicLink(db, admin, session.id);
    expect(await getPublicTracking(db, oldToken)).toBeNull();
    expect(await getPublicTracking(db, newToken)).not.toBeNull();
    const types = (await loadEvents(loadId)).map((e) => e.eventType);
    expect(types).toContain("tracking_link_revoked");
  });

  it("dies past the delivery-set expiry and on a cancelled load", async () => {
    // Expiry: delivered load stops the session and arms the 7-day clock.
    const delivered = await makeBookedLoad();
    await startTracking(db, admin, delivered, { intervalMinutes: 30 });
    let session = (await getTrackingForAdmin(db, admin, delivered))!.session;
    await setLoadStatus(db, admin, delivered, "dispatched");
    await setLoadStatus(db, admin, delivered, "in_transit");
    await setLoadStatus(db, admin, delivered, "delivered");
    await expirePublicLinkOnDelivery(db, admin, delivered);
    session = (await getTrackingForAdmin(db, admin, delivered))!.session;
    expect(session.status).toBe("stopped");
    expect(session.publicExpiresAt).not.toBeNull();
    expect(await getPublicTracking(db, session.publicToken)).not.toBeNull(); // 7 days grace
    await db
      .update(schema.trackingSessions)
      .set({ publicExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.trackingSessions.id, session.id));
    expect(await getPublicTracking(db, session.publicToken)).toBeNull();

    // Cancel: the projection nulls even with a live, unexpired token.
    const cancelled = await makeBookedLoad();
    await startTracking(db, admin, cancelled, { intervalMinutes: 30 });
    const cancelledSession = (await getTrackingForAdmin(db, admin, cancelled))!.session;
    await setLoadStatus(db, admin, cancelled, "cancelled");
    expect(await getPublicTracking(db, cancelledSession.publicToken)).toBeNull();

    // Unknown token: same null.
    expect(await getPublicTracking(db, "no-such-token")).toBeNull();
  });
});

describe("org isolation", () => {
  it("keeps org A's tracking away from org B through the session reader", async () => {
    const loadId = await makeBookedLoad();
    await startTracking(db, admin, loadId, { intervalMinutes: 30 });
    const mine = await getTrackingForLoad(db, "user-a", "org-a", loadId);
    expect(mine).not.toBeNull();
    // The narrow customer projection never carries the webhook secret or phone.
    expect(mine!.session).not.toHaveProperty("webhookSecret");
    expect(mine!.session).not.toHaveProperty("driverPhone");
    expect(mine!.session).not.toHaveProperty("publicToken");
    expect(await getTrackingForLoad(db, "user-b", "org-b", loadId)).toBeNull();
    await expect(getTrackingForLoad(db, "user-b", "org-a", loadId)).rejects.toThrow();
    await expect(getTrackingForAdmin(db, notAdmin, loadId)).rejects.toThrow();
  });
});
