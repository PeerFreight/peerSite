import { and, desc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { RfqInput } from "@/lib/portal/rfq";

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

// ---------------------------------------------------------------------------
// Quote requests (Phase 2). Every mutation appends an events row in the same
// transaction; the events table itself is append-only (DB trigger).

export type NewEvent = {
  organizationId: string;
  quoteRequestId?: string | null;
  actorType: "shipper" | "admin" | "system";
  actorId?: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
};

export async function appendEvent(db: PortalDb, event: NewEvent) {
  await db.insert(schema.events).values({ id: crypto.randomUUID(), ...event });
}

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
        and(eq(schema.events.quoteRequestId, requestId), eq(schema.events.organizationId, orgId)),
      )
      .orderBy(desc(schema.events.createdAt)),
  ]);
  return { request, quotes, events };
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
