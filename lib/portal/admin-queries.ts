import { asc, desc, eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";
import { appendEvent, type PortalDb } from "@/lib/portal/queries";
import type { SendQuoteInput } from "@/lib/portal/rfq";
import { assertAdmin, type PortalUser } from "@/lib/portal/roles";

/**
 * Admin (founder) query layer: the only code that reads across organizations.
 * Every function takes the session user and proves the admin role itself —
 * defense in depth on top of the /admin layout gate.
 */
export type AdminUser = PortalUser & { id: string };

/** Open RFQs oldest-first across all orgs — "quote within the hour" is the
 * product, so the queue surfaces the longest-waiting request on top. */
export async function listOpenQuoteRequests(db: PortalDb, admin: AdminUser) {
  assertAdmin(admin);
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
      hazmat: schema.quoteRequests.hazmat,
      createdAt: schema.quoteRequests.createdAt,
      orgName: schema.organization.name,
    })
    .from(schema.quoteRequests)
    .innerJoin(schema.organization, eq(schema.quoteRequests.organizationId, schema.organization.id))
    .where(inArray(schema.quoteRequests.status, ["submitted", "needs_info"]))
    .orderBy(asc(schema.quoteRequests.createdAt));
}

/** Full cross-org RFQ detail for the admin screen, including the requesting
 * user (for reply email) and the event trail. */
export async function getQuoteRequestForAdmin(db: PortalDb, admin: AdminUser, requestId: string) {
  assertAdmin(admin);
  const rows = await db
    .select({
      request: schema.quoteRequests,
      orgName: schema.organization.name,
      requesterName: schema.user.name,
      requesterEmail: schema.user.email,
    })
    .from(schema.quoteRequests)
    .innerJoin(schema.organization, eq(schema.quoteRequests.organizationId, schema.organization.id))
    .innerJoin(schema.user, eq(schema.quoteRequests.createdByUserId, schema.user.id))
    .where(eq(schema.quoteRequests.id, requestId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const [quotes, events] = await Promise.all([
    db
      .select()
      .from(schema.quotes)
      .where(eq(schema.quotes.quoteRequestId, requestId))
      .orderBy(desc(schema.quotes.createdAt)),
    db
      .select()
      .from(schema.events)
      .where(eq(schema.events.quoteRequestId, requestId))
      .orderBy(desc(schema.events.createdAt)),
  ]);
  return { ...row, quotes, events };
}

/** Send the shipper-facing quote: insert, mark the RFQ quoted, log the event.
 * Returns what the caller needs to email the shipper. */
export async function sendQuote(
  db: PortalDb,
  admin: AdminUser,
  requestId: string,
  input: SendQuoteInput,
) {
  assertAdmin(admin);
  const detail = await getQuoteRequestForAdmin(db, admin, requestId);
  if (!detail) throw new Error("Quote request not found");
  if (!["submitted", "needs_info", "quoted"].includes(detail.request.status)) {
    throw new Error(`Request is ${detail.request.status}; only open requests can be quoted`);
  }
  const quoteId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(schema.quotes).values({
      id: quoteId,
      quoteRequestId: requestId,
      organizationId: detail.request.organizationId,
      allInRateUsd: input.allInRateUsd,
      serviceDescription: input.serviceDescription,
      exclusions: input.exclusions ?? null,
      validUntil: input.validUntil ? new Date(`${input.validUntil}T23:59:59`) : null,
      createdByUserId: admin.id,
    });
    await tx
      .update(schema.quoteRequests)
      .set({ status: "quoted", updatedAt: new Date() })
      .where(eq(schema.quoteRequests.id, requestId));
    await appendEvent(tx, {
      organizationId: detail.request.organizationId,
      quoteRequestId: requestId,
      actorType: "admin",
      actorId: admin.id,
      eventType: "quote_sent",
      payload: { quoteId, allInRateUsd: input.allInRateUsd },
    });
  });
  return { quoteId, requesterEmail: detail.requesterEmail, orgName: detail.orgName };
}

/** One consolidated needs-info ask (not a drip of questions, per the intake
 * runbook). Marks the RFQ and logs the message on the timeline. */
export async function requestInfo(
  db: PortalDb,
  admin: AdminUser,
  requestId: string,
  message: string,
) {
  assertAdmin(admin);
  const detail = await getQuoteRequestForAdmin(db, admin, requestId);
  if (!detail) throw new Error("Quote request not found");
  if (!["submitted", "needs_info"].includes(detail.request.status)) {
    throw new Error(`Request is ${detail.request.status}; needs-info only applies to open requests`);
  }
  await db.transaction(async (tx) => {
    await tx
      .update(schema.quoteRequests)
      .set({ status: "needs_info", needsInfoMessage: message, updatedAt: new Date() })
      .where(eq(schema.quoteRequests.id, requestId));
    await appendEvent(tx, {
      organizationId: detail.request.organizationId,
      quoteRequestId: requestId,
      actorType: "admin",
      actorId: admin.id,
      eventType: "needs_info",
      payload: { message },
    });
  });
  return { requesterEmail: detail.requesterEmail, orgName: detail.orgName };
}
