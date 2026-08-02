import { and, asc, desc, eq, gt, inArray, isNotNull, notInArray, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { RfqInput } from "@/lib/portal/rfq";
import { isPublicLinkLive, serializePublicTracking } from "@/lib/portal/tracking";

/**
 * Org-scoped query layer. The browser never touches the database; every
 * portal read/write goes through functions here, and every function takes
 * the session's userId and filters through membership. Nothing in this file
 * may accept an orgId without also proving the user belongs to it.
 */
export type PortalDb = PgDatabase<PgQueryResultHKT, typeof schema>;

export async function listUserOrganizations(db: PortalDb, userId: string) {
  return db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      role: schema.member.role,
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
    .where(eq(schema.member.userId, userId));
}

/** Returns the org only if the user is a member; null otherwise. */
export async function getOrganizationForUser(db: PortalDb, userId: string, orgId: string) {
  const rows = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      role: schema.member.role,
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
    .where(and(eq(schema.member.userId, userId), eq(schema.member.organizationId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Membership proof used by every org-scoped mutation; throws on failure. */
export async function requireMembership(db: PortalDb, userId: string, orgId: string) {
  const org = await getOrganizationForUser(db, userId, orgId);
  if (!org) throw new Error("Not a member of this organization");
  return org;
}

/** Whether the user can sign in with a password at all — decides Set vs
 * Change password in Settings (magic-link/social users have no credential
 * account row). */
export async function hasCredentialAccount(db: PortalDb, userId: string) {
  const rows = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(
      and(
        eq(schema.account.userId, userId),
        eq(schema.account.providerId, "credential"),
        isNotNull(schema.account.password),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Everyone in the org sees who else is in it (name, email, role). */
export async function listOrgMembers(db: PortalDb, userId: string, orgId: string) {
  await requireMembership(db, userId, orgId);
  return db
    .select({
      id: schema.member.id,
      role: schema.member.role,
      name: schema.user.name,
      email: schema.user.email,
      userId: schema.member.userId,
      createdAt: schema.member.createdAt,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(eq(schema.member.organizationId, orgId))
    .orderBy(asc(schema.member.createdAt));
}

/** Pending, unexpired invitations — owner/admin only (throws otherwise);
 * members see the roster but not who has been invited. */
export async function listPendingInvitations(db: PortalDb, userId: string, orgId: string) {
  const org = await requireMembership(db, userId, orgId);
  if (!["owner", "admin"].includes(org.role)) {
    throw new Error("Only an owner or admin can manage invitations");
  }
  return db
    .select({
      id: schema.invitation.id,
      email: schema.invitation.email,
      role: schema.invitation.role,
      expiresAt: schema.invitation.expiresAt,
    })
    .from(schema.invitation)
    .where(
      and(
        eq(schema.invitation.organizationId, orgId),
        eq(schema.invitation.status, "pending"),
        gt(schema.invitation.expiresAt, new Date()),
      ),
    )
    .orderBy(asc(schema.invitation.expiresAt));
}

/** The pending, unexpired invitation for an email, if any — routes a user
 * who signed up without their invite link to the accept page. */
export async function findPendingInvitationForEmail(db: PortalDb, email: string) {
  const rows = await db
    .select({
      id: schema.invitation.id,
      organizationId: schema.invitation.organizationId,
    })
    .from(schema.invitation)
    .where(
      and(
        sql`lower(${schema.invitation.email}) = ${email.toLowerCase()}`,
        eq(schema.invitation.status, "pending"),
        gt(schema.invitation.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Invitation lookup for the accept page, reachable signed-out (the auth API's
 * getInvitation requires a matching session, so the page reads directly).
 * Possession of the unguessable invitation id is the authorization; the
 * projection stays narrow — no inviter email, no org internals.
 */
export async function getInvitationForAcceptPage(db: PortalDb, invitationId: string) {
  const rows = await db
    .select({
      id: schema.invitation.id,
      email: schema.invitation.email,
      role: schema.invitation.role,
      status: schema.invitation.status,
      expiresAt: schema.invitation.expiresAt,
      organizationId: schema.invitation.organizationId,
      organizationName: schema.organization.name,
      inviterName: schema.user.name,
    })
    .from(schema.invitation)
    .innerJoin(schema.organization, eq(schema.invitation.organizationId, schema.organization.id))
    .innerJoin(schema.user, eq(schema.invitation.inviterId, schema.user.id))
    .where(eq(schema.invitation.id, invitationId))
    .limit(1);
  return rows[0] ?? null;
}

/** Rename the org from Settings. Membership is proven like every write here,
 * plus a role gate: only the org's owner or admin role may rename it. */
export async function updateOrganizationName(
  db: PortalDb,
  userId: string,
  orgId: string,
  name: string,
) {
  const org = await requireMembership(db, userId, orgId);
  if (!["owner", "admin"].includes(org.role)) {
    throw new Error("Only an owner or admin can rename the company");
  }
  if (org.name === name) return;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.organization)
      .set({ name })
      .where(eq(schema.organization.id, orgId));
    await appendEvent(tx, {
      organizationId: orgId,
      actorType: "shipper",
      actorId: userId,
      eventType: "org_renamed",
      payload: { from: org.name, to: name },
    });
  });
}

// ---------------------------------------------------------------------------
// Quote requests (Phase 2). Every mutation appends an events row in the same
// transaction; the events table itself is append-only (DB trigger).

export type NewEvent = {
  organizationId: string;
  quoteRequestId?: string | null;
  loadId?: string | null;
  actorType: "shipper" | "admin" | "system";
  actorId?: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
};

export async function appendEvent(db: PortalDb, event: NewEvent) {
  await db.insert(schema.events).values({ id: crypto.randomUUID(), ...event });
}

/** Desk-internal event types that must never render on a shipper timeline.
 * Carrier events stay internal too: the shipper-facing news is the dispatch
 * status step, and the carrier card appears only once marked visible. */
const INTERNAL_EVENT_TYPES = [
  "document_uploaded_internal",
  "document_hidden",
  "carrier_assigned",
  "carrier_updated",
  // Link revocation is desk plumbing; the shipper-facing news was the send.
  "tracking_link_revoked",
  // Raw provider status callbacks are desk telemetry, not shipper news.
  "tracking_status",
];

export async function createQuoteRequest(
  db: PortalDb,
  userId: string,
  orgId: string,
  input: RfqInput,
) {
  await requireMembership(db, userId, orgId);
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(schema.quoteRequests).values({
      id,
      organizationId: orgId,
      createdByUserId: userId,
      ...input,
    });
    await appendEvent(tx, {
      organizationId: orgId,
      quoteRequestId: id,
      actorType: "shipper",
      actorId: userId,
      eventType: "rfq_submitted",
      payload: {
        lane: `${input.originCity}, ${input.originState} → ${input.destCity}, ${input.destState}`,
        equipment: input.equipment,
        pickupDate: input.pickupDate,
      },
    });
  });
  return id;
}

export async function listQuoteRequests(db: PortalDb, userId: string, orgId: string) {
  await requireMembership(db, userId, orgId);
  return db
    .select({
      id: schema.quoteRequests.id,
      status: schema.quoteRequests.status,
      originCity: schema.quoteRequests.originCity,
      originState: schema.quoteRequests.originState,
      destCity: schema.quoteRequests.destCity,
      destState: schema.quoteRequests.destState,
      pickupDate: schema.quoteRequests.pickupDate,
      equipment: schema.quoteRequests.equipment,
      commodity: schema.quoteRequests.commodity,
      createdAt: schema.quoteRequests.createdAt,
    })
    .from(schema.quoteRequests)
    .where(eq(schema.quoteRequests.organizationId, orgId))
    .orderBy(desc(schema.quoteRequests.createdAt));
}

/** Full RFQ detail — request, its quotes, and its event timeline — only if
 * the request belongs to an org the user is a member of. */
export async function getQuoteRequestDetail(
  db: PortalDb,
  userId: string,
  orgId: string,
  requestId: string,
) {
  await requireMembership(db, userId, orgId);
  const rows = await db
    .select()
    .from(schema.quoteRequests)
    .where(
      and(
        eq(schema.quoteRequests.id, requestId),
        eq(schema.quoteRequests.organizationId, orgId),
      ),
    )
    .limit(1);
  const request = rows[0];
  if (!request) return null;
  const [quotes, events] = await Promise.all([
    db
      .select()
      .from(schema.quotes)
      .where(
        and(eq(schema.quotes.quoteRequestId, requestId), eq(schema.quotes.organizationId, orgId)),
      )
      .orderBy(desc(schema.quotes.createdAt)),
    db
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.quoteRequestId, requestId),
          eq(schema.events.organizationId, orgId),
          notInArray(schema.events.eventType, INTERNAL_EVENT_TYPES),
        ),
      )
      .orderBy(desc(schema.events.createdAt)),
  ]);
  return { request, quotes, events };
}

// ---------------------------------------------------------------------------
// Loads (Phase 3). Loads are created by the admin book action
// (lib/portal/admin-queries.ts); shippers read them here, org-scoped like
// everything else.

const loadListColumns = {
  id: schema.loads.id,
  reference: schema.loads.reference,
  status: schema.loads.status,
  originCity: schema.loads.originCity,
  originState: schema.loads.originState,
  destCity: schema.loads.destCity,
  destState: schema.loads.destState,
  pickupDate: schema.loads.pickupDate,
  deliveryDate: schema.loads.deliveryDate,
  equipment: schema.loads.equipment,
  commodity: schema.loads.commodity,
  createdAt: schema.loads.createdAt,
};

export async function listLoads(db: PortalDb, userId: string, orgId: string) {
  await requireMembership(db, userId, orgId);
  return db
    .select(loadListColumns)
    .from(schema.loads)
    .where(eq(schema.loads.organizationId, orgId))
    .orderBy(desc(schema.loads.createdAt));
}

/** Full load detail for the shipper: the load, its whole event history
 * (pre-booking RFQ events included), shipper-visible documents, and the
 * carrier card once it is marked visible. */
export async function getLoadDetail(db: PortalDb, userId: string, orgId: string, loadId: string) {
  await requireMembership(db, userId, orgId);
  const rows = await db
    .select()
    .from(schema.loads)
    .where(and(eq(schema.loads.id, loadId), eq(schema.loads.organizationId, orgId)))
    .limit(1);
  const load = rows[0];
  if (!load) return null;
  const [events, documents, carrierRows] = await Promise.all([
    db
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.organizationId, orgId),
          notInArray(schema.events.eventType, INTERNAL_EVENT_TYPES),
          or(
            eq(schema.events.loadId, load.id),
            eq(schema.events.quoteRequestId, load.quoteRequestId),
          ),
        ),
      )
      .orderBy(desc(schema.events.createdAt)),
    db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.loadId, load.id),
          eq(schema.documents.organizationId, orgId),
          eq(schema.documents.visibleToShipper, true),
        ),
      )
      .orderBy(desc(schema.documents.createdAt)),
    db
      .select()
      .from(schema.carrierAssignments)
      .where(
        and(
          eq(schema.carrierAssignments.loadId, load.id),
          eq(schema.carrierAssignments.organizationId, orgId),
          eq(schema.carrierAssignments.visibleToShipper, true),
        ),
      )
      .limit(1),
  ]);
  return { load, events, documents, carrier: carrierRows[0] ?? null };
}

// ---------------------------------------------------------------------------
// Live tracking (Phase 6). Two readers with very different trust levels: the
// org-scoped one behind a session, and the token-scoped public projection.

/** Live tracking for the shipper's load page: the latest session (narrow
 * projection — never the webhook secret or the raw driver phone) plus the
 * full breadcrumb. Total transparency is deliberate: the customer sees the
 * same trail the public link shows. */
export async function getTrackingForLoad(
  db: PortalDb,
  userId: string,
  orgId: string,
  loadId: string,
) {
  await requireMembership(db, userId, orgId);
  const sessions = await db
    .select({
      id: schema.trackingSessions.id,
      status: schema.trackingSessions.status,
      originLat: schema.trackingSessions.originLat,
      originLng: schema.trackingSessions.originLng,
      destLat: schema.trackingSessions.destLat,
      destLng: schema.trackingSessions.destLng,
      lastPingAt: schema.trackingSessions.lastPingAt,
      startedAt: schema.trackingSessions.startedAt,
      stoppedAt: schema.trackingSessions.stoppedAt,
    })
    .from(schema.trackingSessions)
    .where(
      and(
        eq(schema.trackingSessions.loadId, loadId),
        eq(schema.trackingSessions.organizationId, orgId),
      ),
    )
    .orderBy(desc(schema.trackingSessions.startedAt))
    .limit(1);
  const session = sessions[0];
  if (!session) return null;
  const pings = await db
    .select({
      lat: schema.locationPings.lat,
      lng: schema.locationPings.lng,
      city: schema.locationPings.city,
      state: schema.locationPings.state,
      etaAt: schema.locationPings.etaAt,
      recordedAt: schema.locationPings.recordedAt,
    })
    .from(schema.locationPings)
    .where(eq(schema.locationPings.trackingSessionId, session.id))
    .orderBy(asc(schema.locationPings.recordedAt));
  return { session, pings };
}

/**
 * The public no-login projection behind /track/<token>. Token-authenticated:
 * possession of the unguessable token IS the authorization. Returns the
 * NARROW payload only — reference, lane city/state, load status, breadcrumb
 * coordinates, ETA. NEVER address lines, driver name/phone, rate, commodity,
 * or org identifiers (tests pin the exact key set). Null when the token is
 * unknown (revocation rotates it away), the link has expired, or the load
 * was cancelled.
 */
export async function getPublicTracking(db: PortalDb, token: string) {
  if (!token) return null;
  const rows = await db
    .select({
      session: schema.trackingSessions,
      load: schema.loads,
    })
    .from(schema.trackingSessions)
    .innerJoin(schema.loads, eq(schema.trackingSessions.loadId, schema.loads.id))
    .where(eq(schema.trackingSessions.publicToken, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (!isPublicLinkLive(row.session)) return null;
  if (row.load.status === "cancelled") return null;
  const pings = await db
    .select({
      lat: schema.locationPings.lat,
      lng: schema.locationPings.lng,
      etaAt: schema.locationPings.etaAt,
      recordedAt: schema.locationPings.recordedAt,
    })
    .from(schema.locationPings)
    .where(eq(schema.locationPings.trackingSessionId, row.session.id))
    .orderBy(asc(schema.locationPings.recordedAt));
  return serializePublicTracking({ load: row.load, session: row.session, pings });
}

/** Fetch one document for download — membership and visibility proven here,
 * so the API route cannot leak across the org boundary. */
export async function getDocumentForUser(
  db: PortalDb,
  userId: string,
  orgId: string,
  documentId: string,
) {
  await requireMembership(db, userId, orgId);
  const rows = await db
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.id, documentId),
        eq(schema.documents.organizationId, orgId),
        eq(schema.documents.visibleToShipper, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Dashboard summary: active loads and open quote requests in one pass. */
export async function getDashboardSummary(db: PortalDb, userId: string, orgId: string) {
  await requireMembership(db, userId, orgId);
  const [activeLoads, openRequests, recentEvents] = await Promise.all([
    db
      .select(loadListColumns)
      .from(schema.loads)
      .where(
        and(
          eq(schema.loads.organizationId, orgId),
          inArray(schema.loads.status, ["booked", "dispatched", "in_transit", "delivered", "invoiced"]),
        ),
      )
      .orderBy(desc(schema.loads.createdAt)),
    db
      .select({
        id: schema.quoteRequests.id,
        status: schema.quoteRequests.status,
        originCity: schema.quoteRequests.originCity,
        originState: schema.quoteRequests.originState,
        destCity: schema.quoteRequests.destCity,
        destState: schema.quoteRequests.destState,
        pickupDate: schema.quoteRequests.pickupDate,
        equipment: schema.quoteRequests.equipment,
        commodity: schema.quoteRequests.commodity,
        createdAt: schema.quoteRequests.createdAt,
      })
      .from(schema.quoteRequests)
      .where(
        and(
          eq(schema.quoteRequests.organizationId, orgId),
          inArray(schema.quoteRequests.status, ["submitted", "needs_info", "quoted"]),
        ),
      )
      .orderBy(desc(schema.quoteRequests.createdAt)),
    db
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.organizationId, orgId),
          notInArray(schema.events.eventType, INTERNAL_EVENT_TYPES),
        ),
      )
      .orderBy(desc(schema.events.createdAt))
      .limit(8),
  ]);
  return { activeLoads, openRequests, recentEvents };
}

/** Shipper declines a quote. Accept has the same shape but stays behind the
 * authority gate (lib/portal/gates.ts) until broker authority is active. */
export async function declineQuote(
  db: PortalDb,
  userId: string,
  orgId: string,
  quoteId: string,
) {
  await requireMembership(db, userId, orgId);
  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(schema.quotes)
      .where(and(eq(schema.quotes.id, quoteId), eq(schema.quotes.organizationId, orgId)))
      .limit(1);
    const quote = rows[0];
    if (!quote) throw new Error("Quote not found");
    if (quote.status !== "sent") throw new Error("Quote is no longer open");
    await tx.update(schema.quotes).set({ status: "declined" }).where(eq(schema.quotes.id, quoteId));
    await tx
      .update(schema.quoteRequests)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(schema.quoteRequests.id, quote.quoteRequestId));
    await appendEvent(tx, {
      organizationId: orgId,
      quoteRequestId: quote.quoteRequestId,
      actorType: "shipper",
      actorId: userId,
      eventType: "quote_declined",
      payload: { quoteId },
    });
  });
}
