import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { CarrierAssignmentInput } from "@/lib/portal/carrier";
import { canTransition, LOAD_STATUS_EVENT } from "@/lib/portal/loads";
import { appendEvent, type PortalDb } from "@/lib/portal/queries";
import { hazmatSummary, type SendQuoteInput } from "@/lib/portal/rfq";
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
      hazmatClass: schema.quoteRequests.hazmatClass,
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
  const [quotes, events, loads] = await Promise.all([
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
    db
      .select({
        id: schema.loads.id,
        reference: schema.loads.reference,
        status: schema.loads.status,
        quoteId: schema.loads.quoteId,
      })
      .from(schema.loads)
      .where(eq(schema.loads.quoteRequestId, requestId)),
  ]);
  return { ...row, quotes, events, loads };
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

// ---------------------------------------------------------------------------
// Loads (Phase 3). Booking turns an agreed quote into a PEER-nnnn load with
// the freight fields snapshotted from the RFQ; the status stepper walks the
// shipper-visible lifecycle and every step lands on the append-only timeline.

/** Book a load from a quote. Pre-authority, acceptance happens over email, so
 * the admin books from a sent quote and the acceptance is recorded here. */
export async function bookLoad(db: PortalDb, admin: AdminUser, quoteId: string) {
  assertAdmin(admin);
  const rows = await db
    .select({
      quote: schema.quotes,
      request: schema.quoteRequests,
      orgName: schema.organization.name,
      requesterEmail: schema.user.email,
      requesterName: schema.user.name,
    })
    .from(schema.quotes)
    .innerJoin(schema.quoteRequests, eq(schema.quotes.quoteRequestId, schema.quoteRequests.id))
    .innerJoin(schema.organization, eq(schema.quotes.organizationId, schema.organization.id))
    .innerJoin(schema.user, eq(schema.quoteRequests.createdByUserId, schema.user.id))
    .where(eq(schema.quotes.id, quoteId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error("Quote not found");
  if (!["sent", "accepted"].includes(row.quote.status)) {
    throw new Error(`Quote is ${row.quote.status}; only an open quote can be booked`);
  }
  const existing = await db
    .select({ id: schema.loads.id })
    .from(schema.loads)
    .where(eq(schema.loads.quoteId, quoteId))
    .limit(1);
  if (existing.length > 0) throw new Error("This quote is already booked");

  const loadId = crypto.randomUUID();
  let reference = "";
  await db.transaction(async (tx) => {
    const seq = (await tx.execute(sql`select nextval('load_reference_seq') as n`)) as unknown as {
      rows: { n: string | number | bigint }[];
    };
    reference = `PEER-${seq.rows[0].n}`;
    const r = row.request;
    await tx.insert(schema.loads).values({
      id: loadId,
      reference,
      organizationId: r.organizationId,
      quoteRequestId: r.id,
      quoteId,
      bookedByUserId: admin.id,
      allInRateUsd: row.quote.allInRateUsd,
      originAddress: r.originAddress,
      originCity: r.originCity,
      originState: r.originState,
      originZip: r.originZip,
      originHours: r.originHours,
      originScheduling: r.originScheduling,
      destAddress: r.destAddress,
      destCity: r.destCity,
      destState: r.destState,
      destZip: r.destZip,
      destHours: r.destHours,
      destScheduling: r.destScheduling,
      pickupDate: r.pickupDate,
      pickupWindow: r.pickupWindow,
      deliveryDate: r.deliveryDate,
      deliveryWindow: r.deliveryWindow,
      commodity: r.commodity,
      weightLbs: r.weightLbs,
      pieces: r.pieces,
      dims: r.dims,
      declaredValueUsd: r.declaredValueUsd,
      equipment: r.equipment,
      temperatureF: r.temperatureF,
      equipmentNotes: r.equipmentNotes,
      hazmat: r.hazmat,
      // The loads table keeps its single free-text hazmat field; snapshot
      // the structured block as the one-line digest so nothing is lost.
      hazmatDetails: r.hazmat
        ? [hazmatSummary(r), r.hazmatUnNumber ? r.hazmatDetails : null]
            .filter(Boolean)
            .join(" — ") || r.hazmatDetails
        : r.hazmatDetails,
      accessorials: r.accessorials,
      referenceNumbers: r.referenceNumbers,
      notes: r.notes,
    });
    if (row.quote.status === "sent") {
      await tx
        .update(schema.quotes)
        .set({ status: "accepted" })
        .where(eq(schema.quotes.id, quoteId));
      await appendEvent(tx, {
        organizationId: r.organizationId,
        quoteRequestId: r.id,
        actorType: "admin",
        actorId: admin.id,
        eventType: "quote_accepted",
        payload: { quoteId, channel: "offline" },
      });
    }
    await tx
      .update(schema.quoteRequests)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(schema.quoteRequests.id, r.id));
    await appendEvent(tx, {
      organizationId: r.organizationId,
      quoteRequestId: r.id,
      loadId,
      actorType: "admin",
      actorId: admin.id,
      eventType: "load_booked",
      payload: { reference, allInRateUsd: row.quote.allInRateUsd },
    });
  });
  return {
    loadId,
    reference,
    orgName: row.orgName,
    requesterEmail: row.requesterEmail,
    requesterName: row.requesterName,
  };
}

/** All loads across orgs, active lifecycle first, newest booked on top. */
export async function listLoadsForAdmin(db: PortalDb, admin: AdminUser) {
  assertAdmin(admin);
  return db
    .select({
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
      hazmat: schema.loads.hazmat,
      createdAt: schema.loads.createdAt,
      orgName: schema.organization.name,
    })
    .from(schema.loads)
    .innerJoin(schema.organization, eq(schema.loads.organizationId, schema.organization.id))
    .orderBy(
      asc(sql`case when ${schema.loads.status} in ('closed', 'cancelled') then 1 else 0 end`),
      desc(schema.loads.createdAt),
    );
}

/** Cross-org load detail for the admin screen, with the requester (for
 * email), the full event trail, and the source RFQ id. */
export async function getLoadForAdmin(db: PortalDb, admin: AdminUser, loadId: string) {
  assertAdmin(admin);
  const rows = await db
    .select({
      load: schema.loads,
      orgName: schema.organization.name,
      requesterName: schema.user.name,
      requesterEmail: schema.user.email,
    })
    .from(schema.loads)
    .innerJoin(schema.organization, eq(schema.loads.organizationId, schema.organization.id))
    .innerJoin(schema.quoteRequests, eq(schema.loads.quoteRequestId, schema.quoteRequests.id))
    .innerJoin(schema.user, eq(schema.quoteRequests.createdByUserId, schema.user.id))
    .where(eq(schema.loads.id, loadId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const [events, documents, carrierRows] = await Promise.all([
    db
      .select()
      .from(schema.events)
      .where(
        or(
          eq(schema.events.loadId, loadId),
          eq(schema.events.quoteRequestId, row.load.quoteRequestId),
        ),
      )
      .orderBy(desc(schema.events.createdAt)),
    db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.loadId, loadId))
      .orderBy(desc(schema.documents.createdAt)),
    db
      .select()
      .from(schema.carrierAssignments)
      .where(eq(schema.carrierAssignments.loadId, loadId))
      .limit(1),
  ]);
  return { ...row, events, documents, carrier: carrierRows[0] ?? null };
}

/** Walk the load one legal step (or cancel). Writes status + event in one
 * transaction and returns what the caller needs to email the shipper. */
export async function setLoadStatus(
  db: PortalDb,
  admin: AdminUser,
  loadId: string,
  next: schema.LoadStatus,
) {
  assertAdmin(admin);
  const detail = await getLoadForAdmin(db, admin, loadId);
  if (!detail) throw new Error("Load not found");
  const from = detail.load.status;
  if (!canTransition(from, next)) {
    throw new Error(`A ${from} load cannot move to ${next}`);
  }
  await db.transaction(async (tx) => {
    await tx
      .update(schema.loads)
      .set({ status: next, updatedAt: new Date() })
      .where(and(eq(schema.loads.id, loadId), eq(schema.loads.status, from)));
    await appendEvent(tx, {
      organizationId: detail.load.organizationId,
      quoteRequestId: detail.load.quoteRequestId,
      loadId,
      actorType: "admin",
      actorId: admin.id,
      eventType: LOAD_STATUS_EVENT[next as Exclude<schema.LoadStatus, "booked">],
      payload: { from, to: next },
    });
  });
  return {
    reference: detail.load.reference,
    orgName: detail.orgName,
    requesterEmail: detail.requesterEmail,
    from,
    to: next,
  };
}

// ---------------------------------------------------------------------------
// Documents (Phase 4). Blob bytes go through lib/storage.ts; only metadata
// lands here. Sharing state changes are events like everything else.

export type NewDocumentMeta = {
  type: schema.DocumentType;
  filename: string;
  contentType: string;
  sizeBytes: number;
  storagePath: string;
  visibleToShipper: boolean;
};

/** Record an uploaded document on a load (bytes already stored). */
export async function addDocument(
  db: PortalDb,
  admin: AdminUser,
  loadId: string,
  meta: NewDocumentMeta,
) {
  assertAdmin(admin);
  const detail = await getLoadForAdmin(db, admin, loadId);
  if (!detail) throw new Error("Load not found");
  const documentId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(schema.documents).values({
      id: documentId,
      loadId,
      organizationId: detail.load.organizationId,
      uploadedByUserId: admin.id,
      ...meta,
    });
    await appendEvent(tx, {
      organizationId: detail.load.organizationId,
      quoteRequestId: detail.load.quoteRequestId,
      loadId,
      actorType: "admin",
      actorId: admin.id,
      eventType: meta.visibleToShipper ? "document_added" : "document_uploaded_internal",
      payload: { documentId, type: meta.type, label: meta.filename },
    });
  });
  return {
    documentId,
    reference: detail.load.reference,
    orgName: detail.orgName,
    requesterEmail: detail.requesterEmail,
  };
}

/** Share (or unshare) a document with the shipper after upload. */
export async function setDocumentVisibility(
  db: PortalDb,
  admin: AdminUser,
  documentId: string,
  visible: boolean,
) {
  assertAdmin(admin);
  const rows = await db
    .select({ doc: schema.documents, load: schema.loads })
    .from(schema.documents)
    .innerJoin(schema.loads, eq(schema.documents.loadId, schema.loads.id))
    .where(eq(schema.documents.id, documentId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error("Document not found");
  if (row.doc.visibleToShipper === visible) return row;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.documents)
      .set({ visibleToShipper: visible })
      .where(eq(schema.documents.id, documentId));
    await appendEvent(tx, {
      organizationId: row.doc.organizationId,
      quoteRequestId: row.load.quoteRequestId,
      loadId: row.doc.loadId,
      actorType: "admin",
      actorId: admin.id,
      eventType: visible ? "document_added" : "document_hidden",
      payload: { documentId, type: row.doc.type, label: row.doc.filename },
    });
  });
  return row;
}

/** Admin download path: any document, role re-proven here. */
export async function getDocumentForAdmin(db: PortalDb, admin: AdminUser, documentId: string) {
  assertAdmin(admin);
  const rows = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Carrier assignment (Phase 5). Upsert — one carrier per load in v1; a
// replacement carrier overwrites in place and the timeline keeps the history.

export async function upsertCarrierAssignment(
  db: PortalDb,
  admin: AdminUser,
  loadId: string,
  input: CarrierAssignmentInput,
) {
  assertAdmin(admin);
  const detail = await getLoadForAdmin(db, admin, loadId);
  if (!detail) throw new Error("Load not found");
  const existingRows = await db
    .select()
    .from(schema.carrierAssignments)
    .where(eq(schema.carrierAssignments.loadId, loadId))
    .limit(1);
  const existing = existingRows[0];

  await db.transaction(async (tx) => {
    if (existing) {
      await tx
        .update(schema.carrierAssignments)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(schema.carrierAssignments.id, existing.id));
    } else {
      await tx.insert(schema.carrierAssignments).values({
        id: crypto.randomUUID(),
        loadId,
        organizationId: detail.load.organizationId,
        assignedByUserId: admin.id,
        ...input,
      });
    }
    await appendEvent(tx, {
      organizationId: detail.load.organizationId,
      quoteRequestId: detail.load.quoteRequestId,
      loadId,
      actorType: "admin",
      actorId: admin.id,
      eventType: existing ? "carrier_updated" : "carrier_assigned",
      payload: {
        carrierName: input.carrierName,
        visibleToShipper: input.visibleToShipper,
      },
    });
  });
  return {
    reference: detail.load.reference,
    orgName: detail.orgName,
    requesterEmail: detail.requesterEmail,
    updated: Boolean(existing),
  };
}
