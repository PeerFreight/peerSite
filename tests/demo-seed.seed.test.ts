// Demo/acceptance seed — NOT part of the normal suite (gated on DEMO_SEED=1
// and skipped otherwise). Walks one load through the entire v1 lifecycle via
// the real query layer against the dev database (scripts/dev-db.ts), so the
// running app can be reviewed with realistic state. Expects the HTTP-created
// demo accounts to already exist; see the acceptance walkthrough notes.
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import {
  addDocument,
  bookLoad,
  sendQuote,
  setLoadStatus,
  upsertCarrierAssignment,
  type AdminUser,
} from "../lib/portal/admin-queries";
import { createQuoteRequest, type PortalDb } from "../lib/portal/queries";
import { getTrackingForAdmin, startTracking } from "../lib/portal/tracking-queries";
import type { RfqInput } from "../lib/portal/rfq";
import { documentPath, getStorage } from "../lib/storage";

const rfq: RfqInput = {
  originAddress: "17700 Boonville Rd",
  originCity: "Boonville",
  originState: "CA",
  originZip: "95415",
  originHours: "7:00-15:00",
  originScheduling: "fcfs",
  destAddress: null,
  destCity: "Fairfield",
  destState: "CA",
  destZip: "94533",
  destHours: null,
  destScheduling: "appointment",
  pickupDate: "2026-08-05",
  pickupWindow: "morning",
  deliveryDate: "2026-08-06",
  deliveryWindow: null,
  dateFlexibility: "flexible",
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
  frequency: "recurring",
  notes: "Can-dunnage return to Fairfield pairs with this lane.",
};

describe.skipIf(!process.env.DEMO_SEED)("demo seed", () => {
  it("walks one load through the full lifecycle", async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const db = drizzle(pool, { schema }) as unknown as PortalDb;

    const byEmail = async (email: string) =>
      (await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1))[0];

    const founder = await byEmail("admin@peer-freight.com");
    const customer = await byEmail("customer@peerfreight.com");
    expect(founder, "run the HTTP account setup first").toBeTruthy();
    expect(customer, "run the HTTP account setup first").toBeTruthy();
    const admin: AdminUser = { id: founder.id, email: founder.email, emailVerified: true };

    const membership = (
      await db.select().from(schema.member).where(eq(schema.member.userId, customer.id)).limit(1)
    )[0];
    expect(membership, "the customer needs an org (onboarding) first").toBeTruthy();
    const orgId = membership.organizationId;

    // Shipper submits the RFQ; admin quotes it; admin books on acceptance.
    const requestId = await createQuoteRequest(db, customer.id, orgId, rfq);
    const { quoteId } = await sendQuote(db, admin, requestId, {
      allInRateUsd: "1850",
      serviceDescription: "Dry van 53', liftgate delivery, POD same day",
      exclusions: "Detention after 2h $75/h; TONU $250",
      validUntil: "2026-08-04",
    });
    const { loadId, reference } = await bookLoad(db, admin, quoteId);

    // Dispatch with a visible carrier card + tracking link.
    await setLoadStatus(db, admin, loadId, "dispatched");
    await upsertCarrierAssignment(db, admin, loadId, {
      carrierName: "Golden State Carriers LLC",
      mcNumber: "MC 998877",
      driverName: "R. Alvarez",
      driverPhone: "+1 555 010 2233",
      truckNumber: "412",
      trailerNumber: "53-8801",
      trackingUrl: "https://track.example.com/peer-demo",
      visibleToShipper: true,
    });

    // Rate confirmation shared with the shipper (bytes on the dev disk).
    const docId = crypto.randomUUID();
    const path = documentPath(orgId, loadId, docId, "rate-confirmation.pdf");
    const bytes = Buffer.from(`%PDF-1.4 demo rate confirmation for ${reference}\n`);
    await getStorage().put(path, bytes, "application/pdf");
    await addDocument(db, admin, loadId, {
      type: "rate_confirmation",
      filename: "rate-confirmation.pdf",
      contentType: "application/pdf",
      sizeBytes: bytes.length,
      storagePath: path,
      visibleToShipper: true,
    });

    await setLoadStatus(db, admin, loadId, "in_transit");
    await setLoadStatus(db, admin, loadId, "delivered");

    console.log(`seeded ${reference} (load ${loadId}) for org ${orgId}`);

    // A second load left in transit WITH a live (stub) tracking session, so
    // the tracking map, public link, and simulator have something to bite.
    const second = await createQuoteRequest(db, customer.id, orgId, {
      ...rfq,
      destCity: "Reno",
      destState: "NV",
      destZip: "89502",
      destScheduling: "fcfs",
      pickupDate: "2026-08-07",
      deliveryDate: "2026-08-08",
      notes: null,
    });
    const secondQuote = await sendQuote(db, admin, second, {
      allInRateUsd: "2150",
      serviceDescription: "Dry van 53', door to door.",
      exclusions: null,
      validUntil: null,
    });
    const booked = await bookLoad(db, admin, secondQuote.quoteId);
    await upsertCarrierAssignment(db, admin, booked.loadId, {
      carrierName: "Sierra Haulers LLC",
      mcNumber: "MC 445566",
      driverName: "D. Kowalski",
      driverPhone: "(555) 010-4477",
      truckNumber: "88",
      trailerNumber: "53-1201",
      trackingUrl: null,
      visibleToShipper: true,
    });
    await setLoadStatus(db, admin, booked.loadId, "dispatched");
    const { sessionId, publicToken } = await startTracking(db, admin, booked.loadId, {
      intervalMinutes: 30,
    });
    await setLoadStatus(db, admin, booked.loadId, "in_transit");
    const session = (await getTrackingForAdmin(db, admin, booked.loadId))!.session;
    console.log(
      `seeded ${booked.reference} (load ${booked.loadId}) with live tracking\n` +
        `  public link: /track/${publicToken}\n` +
        `  simulator:   node scripts/track-sim.ts http://localhost:3000/api/tracking/callback/${sessionId}/${session.webhookSecret} --from 38.23,-122.63 --to 39.52,-119.81`,
    );
    await pool.end();
  }, 60_000);
});
