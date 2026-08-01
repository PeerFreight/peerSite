import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { getLoadForAdmin, type AdminUser } from "@/lib/portal/admin-queries";
import { appendEvent, type PortalDb } from "@/lib/portal/queries";
import {
  normalizePhone,
  PUBLIC_LINK_TTL_DAYS,
  TRACKABLE_LOAD_STATUSES,
} from "@/lib/portal/tracking";
import { baseUrl } from "@/lib/portal/urls";
import { getTrackingProvider } from "@/lib/tracking";
import { geocodeCityStateZip } from "@/lib/tracking/geocode";
import type { NormalizedPing } from "@/lib/tracking/provider";
import { assertAdmin } from "@/lib/portal/roles";

/**
 * Admin tracking mutations, in the admin-queries.ts shape: every function
 * takes the session user and re-proves the admin role. recordPing is the one
 * exception — it is called by the webhook route, whose caller is the provider
 * authenticating with the per-session secret, not a user.
 */

/** Sessions still expecting provider pings. */
const LIVE_SESSION_STATUSES: schema.TrackingSessionStatus[] = ["requested", "active"];

function newToken() {
  // Opaque DB-backed tokens: revocation and rotation are row updates, and
  // there is nothing to decode or forge (vs. a JWT).
  return randomBytes(24).toString("base64url");
}

/** Where the provider must POST callbacks. MacroPoint can only reach the
 * public prod domain, so PORTAL_TRACKING_CALLBACK_BASE overrides the deploy's
 * own URL (preview deployments, localhost tunnels). */
function callbackBase() {
  return process.env.PORTAL_TRACKING_CALLBACK_BASE ?? baseUrl();
}

export function callbackUrl(sessionId: string, webhookSecret: string) {
  return `${callbackBase()}/api/tracking/callback/${sessionId}/${webhookSecret}`;
}

export async function getLiveSessionForLoad(db: PortalDb, loadId: string) {
  const rows = await db
    .select()
    .from(schema.trackingSessions)
    .where(
      and(
        eq(schema.trackingSessions.loadId, loadId),
        inArray(schema.trackingSessions.status, LIVE_SESSION_STATUSES),
      ),
    )
    .orderBy(desc(schema.trackingSessions.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Start a tracking session for a load: requires an assigned carrier with a
 * driver phone, a load that is booked/dispatched/in_transit, and no live
 * session. Inserts the row first, then calls the provider, then records the
 * outcome — deliberately NOT one transaction, since a DB transaction must
 * never stay open across a network call. A provider failure leaves an
 * `error` row (visible in the admin UI, safe to retry with a fresh start).
 */
export async function startTracking(
  db: PortalDb,
  admin: AdminUser,
  loadId: string,
  input: { intervalMinutes: number },
) {
  assertAdmin(admin);
  const detail = await getLoadForAdmin(db, admin, loadId);
  if (!detail) throw new Error("Load not found");
  const { load, carrier } = detail;
  if (!(TRACKABLE_LOAD_STATUSES as readonly string[]).includes(load.status)) {
    throw new Error(`Tracking starts on a booked, dispatched, or in-transit load — this one is ${load.status}`);
  }
  if (!carrier?.driverPhone) {
    throw new Error("Assign a carrier with a driver phone number first");
  }
  const driverPhone = normalizePhone(carrier.driverPhone);
  if (await getLiveSessionForLoad(db, loadId)) {
    throw new Error("This load already has a live tracking session");
  }

  const sessionId = crypto.randomUUID();
  const webhookSecret = newToken();
  const publicToken = newToken();
  const provider = getTrackingProvider();

  // Best-effort pins for the map; a missing key or a geocode failure never
  // blocks tracking.
  const [origin, dest] = await Promise.all([
    geocodeCityStateZip(load.originCity, load.originState, load.originZip),
    geocodeCityStateZip(load.destCity, load.destState, load.destZip),
  ]);

  await db.insert(schema.trackingSessions).values({
    id: sessionId,
    loadId,
    organizationId: load.organizationId,
    provider: provider.name,
    status: "requested",
    driverPhone,
    intervalMinutes: input.intervalMinutes,
    webhookSecret,
    publicToken,
    originLat: origin?.lat ?? null,
    originLng: origin?.lng ?? null,
    destLat: dest?.lat ?? null,
    destLng: dest?.lng ?? null,
    startedByUserId: admin.id,
  });

  let externalOrderId: string;
  try {
    ({ externalOrderId } = await provider.startTracking({
      sessionId,
      loadReference: load.reference,
      driverPhone,
      intervalMinutes: input.intervalMinutes,
      callbackUrl: callbackUrl(sessionId, webhookSecret),
      origin: { city: load.originCity, state: load.originState, zip: load.originZip },
      dest: { city: load.destCity, state: load.destState, zip: load.destZip },
      pickupDate: load.pickupDate,
      deliveryDate: load.deliveryDate,
    }));
  } catch (err) {
    await db
      .update(schema.trackingSessions)
      .set({ status: "error", stoppedAt: new Date() })
      .where(eq(schema.trackingSessions.id, sessionId));
    throw err;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.trackingSessions)
      .set({ externalOrderId })
      .where(eq(schema.trackingSessions.id, sessionId));
    await appendEvent(tx, {
      organizationId: load.organizationId,
      quoteRequestId: load.quoteRequestId,
      loadId,
      actorType: "admin",
      actorId: admin.id,
      eventType: "tracking_started",
      payload: { sessionId, provider: provider.name, intervalMinutes: input.intervalMinutes },
    });
  });

  return { sessionId, publicToken, provider: provider.name };
}

/** Stop the live session (provider first, best-effort; the row always stops). */
export async function stopTracking(db: PortalDb, admin: AdminUser, loadId: string) {
  assertAdmin(admin);
  const detail = await getLoadForAdmin(db, admin, loadId);
  if (!detail) throw new Error("Load not found");
  const session = await getLiveSessionForLoad(db, loadId);
  if (!session) throw new Error("No live tracking session on this load");
  await stopSession(db, session, { actorType: "admin", actorId: admin.id });
  return { sessionId: session.id };
}

/** Shared stop path: tell the provider (best-effort), stop the row, log. */
async function stopSession(
  db: PortalDb,
  session: typeof schema.trackingSessions.$inferSelect,
  actor: { actorType: "admin" | "system"; actorId: string | null },
  extra?: { publicExpiresAt?: Date; reason?: string },
) {
  if (session.externalOrderId) {
    try {
      await getTrackingProvider(session.provider).stopTracking(session.externalOrderId);
    } catch (err) {
      console.error("provider stopTracking failed", err);
    }
  }
  await db.transaction(async (tx) => {
    await tx
      .update(schema.trackingSessions)
      .set({
        status: "stopped",
        stoppedAt: new Date(),
        ...(extra?.publicExpiresAt ? { publicExpiresAt: extra.publicExpiresAt } : {}),
      })
      .where(eq(schema.trackingSessions.id, session.id));
    await appendEvent(tx, {
      organizationId: session.organizationId,
      loadId: session.loadId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      eventType: "tracking_stopped",
      payload: { sessionId: session.id, ...(extra?.reason ? { reason: extra.reason } : {}) },
    });
  });
}

/**
 * Delivery lifecycle hook: stop the provider session and start the public
 * link's 7-day expiry clock. No live session is fine (tracking was optional
 * or already stopped) — then only an unexpired link gets its clock set.
 */
export async function expirePublicLinkOnDelivery(db: PortalDb, admin: AdminUser, loadId: string) {
  assertAdmin(admin);
  const expiresAt = new Date(Date.now() + PUBLIC_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
  const live = await getLiveSessionForLoad(db, loadId);
  if (live) {
    await stopSession(
      db,
      live,
      { actorType: "admin", actorId: admin.id },
      { publicExpiresAt: expiresAt, reason: "delivered" },
    );
    return;
  }
  // Already-stopped sessions still carry a live link until expiry is set.
  await db
    .update(schema.trackingSessions)
    .set({ publicExpiresAt: expiresAt })
    .where(
      and(
        eq(schema.trackingSessions.loadId, loadId),
        sql`${schema.trackingSessions.publicExpiresAt} is null`,
      ),
    );
}

/** Rotate the public token. The old link 404s immediately; the fresh token
 * keeps the logged-in views and any re-send fully working. */
export async function revokePublicLink(db: PortalDb, admin: AdminUser, sessionId: string) {
  assertAdmin(admin);
  const rows = await db
    .select()
    .from(schema.trackingSessions)
    .where(eq(schema.trackingSessions.id, sessionId))
    .limit(1);
  const session = rows[0];
  if (!session) throw new Error("Tracking session not found");
  const publicToken = newToken();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.trackingSessions)
      .set({ publicToken, publicTokenRevokedAt: new Date() })
      .where(eq(schema.trackingSessions.id, sessionId));
    await appendEvent(tx, {
      organizationId: session.organizationId,
      loadId: session.loadId,
      actorType: "admin",
      actorId: admin.id,
      eventType: "tracking_link_revoked",
      payload: { sessionId },
    });
  });
  return { publicToken };
}

/**
 * Record one normalized ping onto a session. Called by the webhook route
 * (already authenticated by the per-session secret) and the manual-ping
 * action — deliberately no admin argument. Idempotent: the partial unique
 * index absorbs provider retries that carry an event id, and pings without
 * one fall back to a (session, recordedAt, lat, lng) dedupe.
 */
export async function recordPing(
  db: PortalDb,
  session: { id: string; loadId: string; organizationId: string; status: schema.TrackingSessionStatus },
  ping: NormalizedPing,
): Promise<{ inserted: boolean }> {
  if (!ping.providerEventId) {
    const dupes = await db
      .select({ id: schema.locationPings.id })
      .from(schema.locationPings)
      .where(
        and(
          eq(schema.locationPings.trackingSessionId, session.id),
          eq(schema.locationPings.recordedAt, ping.recordedAt),
          eq(schema.locationPings.lat, ping.lat),
          eq(schema.locationPings.lng, ping.lng),
        ),
      )
      .limit(1);
    if (dupes.length > 0) return { inserted: false };
  }
  const result = await db
    .insert(schema.locationPings)
    .values({
      id: crypto.randomUUID(),
      trackingSessionId: session.id,
      loadId: session.loadId,
      organizationId: session.organizationId,
      lat: ping.lat,
      lng: ping.lng,
      city: ping.city,
      state: ping.state,
      etaAt: ping.etaAt,
      providerStatus: ping.providerStatus,
      providerEventId: ping.providerEventId,
      source: ping.source,
      recordedAt: ping.recordedAt,
    })
    .onConflictDoNothing()
    .returning({ id: schema.locationPings.id });
  if (result.length === 0) return { inserted: false };

  await db
    .update(schema.trackingSessions)
    .set({
      lastPingAt: sql`greatest(coalesce(${schema.trackingSessions.lastPingAt}, ${ping.recordedAt}), ${ping.recordedAt})`,
      // First ping proves the pipeline: requested → active.
      status: sql`case when ${schema.trackingSessions.status} = 'requested' then 'active' else ${schema.trackingSessions.status} end`,
    })
    .where(eq(schema.trackingSessions.id, session.id));
  return { inserted: true };
}

/** Latest session (any status) + full breadcrumb for the admin load page. */
export async function getTrackingForAdmin(db: PortalDb, admin: AdminUser, loadId: string) {
  assertAdmin(admin);
  const rows = await db
    .select()
    .from(schema.trackingSessions)
    .where(eq(schema.trackingSessions.loadId, loadId))
    .orderBy(desc(schema.trackingSessions.startedAt))
    .limit(1);
  const session = rows[0];
  if (!session) return null;
  const pings = await db
    .select()
    .from(schema.locationPings)
    .where(eq(schema.locationPings.trackingSessionId, session.id))
    .orderBy(asc(schema.locationPings.recordedAt));
  return { session, pings };
}
