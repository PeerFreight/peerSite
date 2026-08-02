"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { LoadStatus } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import {
  addDocument,
  bookLoad,
  clearLoadDelay,
  createInvoice,
  getLoadForAdmin,
  markInvoicePaid,
  requestInfo,
  sendQuote,
  setDocumentVisibility,
  setLoadDelay,
  setLoadStatus,
  upsertCarrierAssignment,
} from "@/lib/portal/admin-queries";
import { carrierAssignmentSchema } from "@/lib/portal/carrier";
import {
  DOCUMENT_TYPE_LABELS,
  documentMetaSchema,
  MAX_DOCUMENT_BYTES,
} from "@/lib/portal/documents";
import { createInvoiceSchema } from "@/lib/portal/invoices";
import { delaySchema } from "@/lib/portal/loads";
import {
  composeDelayCleared,
  composeDelaySet,
  composeDocumentShared,
  composeInvoiceIssued,
  composeLoadBooked,
  composeLoadStatus,
  composeNeedsInfo,
  composeQuoteSent,
  deliver,
} from "@/lib/portal/notify";
import { needsInfoSchema, sendQuoteSchema } from "@/lib/portal/rfq";
import { requireAdminSession } from "@/lib/portal/session";
import { PUBLIC_LINK_TTL_DAYS, trackingPublicUrl } from "@/lib/portal/tracking";
import {
  expirePublicLinkOnDelivery,
  getLiveSessionForLoad,
  getTrackingForAdmin,
  recordPing,
  revokePublicLink,
  startTracking,
  stopTracking,
} from "@/lib/portal/tracking-queries";
import { appendEvent } from "@/lib/portal/queries";
import { documentPath, getStorage } from "@/lib/storage";

export type AdminFormState = {
  fieldErrors: Record<string, string[] | undefined>;
  formError: string | null;
  ok?: boolean;
  /** Success with a caveat (e.g. carrier saved but tracking didn't start). */
  notice?: string;
} | null;

function refreshQuotePages(requestId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/quotes/${requestId}`);
  revalidatePath(`/quotes/${requestId}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
}

export async function sendQuoteAction(
  requestId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();

  const parsed = sendQuoteSchema.safeParse({
    allInRateUsd: formData.get("allInRateUsd") ?? "",
    serviceDescription: formData.get("serviceDescription") ?? "",
    exclusions: formData.get("exclusions") ?? "",
    validUntil: formData.get("validUntil") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, formError: "Fix the highlighted fields." };
  }

  let result;
  try {
    result = await sendQuote(db, session.user, requestId, parsed.data);
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not send the quote." };
  }

  try {
    await deliver(
      composeQuoteSent({
        to: result.requesterEmail,
        requestId,
        allInRateUsd: parsed.data.allInRateUsd,
        serviceDescription: parsed.data.serviceDescription,
        exclusions: parsed.data.exclusions,
        validUntil: parsed.data.validUntil,
        note: parsed.data.note,
      }),
    );
  } catch (err) {
    console.error("quote-ready email failed", err);
  }

  refreshQuotePages(requestId);
  return { fieldErrors: {}, formError: null, ok: true };
}

export async function needsInfoAction(
  requestId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();

  const parsed = needsInfoSchema.safeParse({ message: formData.get("message") ?? "" });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, formError: "Write the ask first." };
  }

  let result;
  try {
    result = await requestInfo(db, session.user, requestId, parsed.data.message);
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not send the ask." };
  }

  try {
    await deliver(
      composeNeedsInfo({
        to: result.requesterEmail,
        requestId,
        message: parsed.data.message,
      }),
    );
  } catch (err) {
    console.error("needs-info email failed", err);
  }

  refreshQuotePages(requestId);
  return { fieldErrors: {}, formError: null, ok: true };
}

// ---------------------------------------------------------------------------
// Loads (Phase 3)

function refreshLoadPages(loadId: string) {
  revalidatePath("/admin/loads");
  revalidatePath(`/admin/loads/${loadId}`);
  revalidatePath(`/loads/${loadId}`);
  revalidatePath("/loads");
  revalidatePath("/dashboard");
}

/** Book the load from a quote (acceptance recorded from the email/phone
 * agreement pre-authority), then send the shipper the booking confirmation. */
export async function bookLoadAction(
  quoteId: string,
  requestId: string,
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();

  let result;
  try {
    result = await bookLoad(db, session.user, quoteId);
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not book the load." };
  }

  try {
    await deliver(
      composeLoadBooked({
        to: result.requesterEmail,
        reference: result.reference,
        loadId: result.loadId,
      }),
    );
  } catch (err) {
    console.error("booking email failed", err);
  }

  refreshQuotePages(requestId);
  refreshLoadPages(result.loadId);
  redirect(`/admin/loads/${result.loadId}`);
}

/** One legal lifecycle step (or cancel); emails the shipper each move. */
export async function setLoadStatusAction(
  loadId: string,
  next: LoadStatus,
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();

  let result;
  try {
    result = await setLoadStatus(db, session.user, loadId, next);
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not update the load." };
  }

  // Delivery stops the provider session and starts the public link's 7-day
  // expiry clock; a cancelled load stops tracking outright.
  if (next === "delivered") {
    try {
      await expirePublicLinkOnDelivery(db, session.user, loadId);
    } catch (err) {
      console.error("tracking expiry on delivery failed", err);
    }
  } else if (next === "cancelled") {
    try {
      if (await getLiveSessionForLoad(db, loadId)) await stopTracking(db, session.user, loadId);
    } catch (err) {
      console.error("tracking stop on cancel failed", err);
    }
  }

  // The dispatch / in-transit emails carry the shareable live-tracking link
  // when a session is live (passed as an extra line so notify.ts stays
  // tracking-free).
  const extraLines: string[] = [];
  if (["dispatched", "in_transit"].includes(next)) {
    try {
      const live = await getLiveSessionForLoad(db, loadId);
      if (live) {
        extraLines.push(
          `Live tracking (shareable, no login): ${trackingPublicUrl(live.publicToken)}`,
        );
      }
    } catch (err) {
      console.error("tracking link lookup failed", err);
    }
  }

  try {
    await deliver(
      composeLoadStatus({
        to: result.requesterEmail,
        reference: result.reference,
        loadId,
        next: next as Exclude<LoadStatus, "booked">,
        extraLines,
      }),
    );
  } catch (err) {
    console.error("load status email failed", err);
  }

  refreshLoadPages(loadId);
  return { fieldErrors: {}, formError: null, ok: true };
}

// ---------------------------------------------------------------------------
// Documents (Phase 4)

/** Store the file, record the document, and email the shipper if shared. */
export async function uploadDocumentAction(
  loadId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { fieldErrors: { file: ["Choose a file."] }, formError: null };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return {
      fieldErrors: { file: [`Max ${Math.floor(MAX_DOCUMENT_BYTES / 1024 / 1024)} MB.`] },
      formError: null,
    };
  }
  const parsedMeta = documentMetaSchema.safeParse({
    type: formData.get("type") ?? "",
    visibleToShipper: formData.get("visibleToShipper") === "on",
  });
  if (!parsedMeta.success) {
    return { fieldErrors: z.flattenError(parsedMeta.error).fieldErrors, formError: null };
  }

  let result;
  try {
    const docId = crypto.randomUUID();
    // Load lookup (and admin re-proof) happens inside addDocument; the
    // storage path needs the org, so fetch the load once here too.
    const detail = await getLoadForAdmin(db, session.user, loadId);
    if (!detail) throw new Error("Load not found");
    const storagePath = documentPath(detail.load.organizationId, loadId, docId, file.name);
    await getStorage().put(
      storagePath,
      Buffer.from(await file.arrayBuffer()),
      file.type || "application/octet-stream",
    );
    result = await addDocument(db, session.user, loadId, {
      type: parsedMeta.data.type,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      storagePath,
      visibleToShipper: parsedMeta.data.visibleToShipper,
    });
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Upload failed." };
  }

  if (parsedMeta.data.visibleToShipper) {
    try {
      await deliver(
        composeDocumentShared({
          to: result.requesterEmail,
          reference: result.reference,
          loadId,
          typeLabel: DOCUMENT_TYPE_LABELS[parsedMeta.data.type],
        }),
      );
    } catch (err) {
      console.error("document email failed", err);
    }
  }

  refreshLoadPages(loadId);
  return { fieldErrors: {}, formError: null, ok: true };
}

/** Flip a document's shipper visibility; sharing emails the shipper. */
export async function setDocumentVisibilityAction(
  documentId: string,
  loadId: string,
  visible: boolean,
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();

  let row;
  try {
    row = await setDocumentVisibility(db, session.user, documentId, visible);
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not update." };
  }

  if (visible) {
    try {
      const detail = await getLoadForAdmin(db, session.user, loadId);
      if (detail) {
        await deliver(
          composeDocumentShared({
            to: detail.requesterEmail,
            reference: detail.load.reference,
            loadId,
            typeLabel: DOCUMENT_TYPE_LABELS[row.doc.type],
          }),
        );
      }
    } catch (err) {
      console.error("document email failed", err);
    }
  }

  refreshLoadPages(loadId);
  return { fieldErrors: {}, formError: null, ok: true };
}

// ---------------------------------------------------------------------------
// Carrier assignment (Phase 5)

/** Assign or update the load's carrier; sharing puts the card (and tracking
 * link) on the shipper's load page. */
export async function assignCarrierAction(
  loadId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();

  const parsed = carrierAssignmentSchema.safeParse({
    carrierName: formData.get("carrierName") ?? "",
    mcNumber: formData.get("mcNumber") ?? "",
    driverName: formData.get("driverName") ?? "",
    driverPhone: formData.get("driverPhone") ?? "",
    truckNumber: formData.get("truckNumber") ?? "",
    trailerNumber: formData.get("trailerNumber") ?? "",
    trackingUrl: formData.get("trackingUrl") ?? "",
    visibleToShipper: formData.get("visibleToShipper") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, formError: "Fix the highlighted fields." };
  }

  try {
    await upsertCarrierAssignment(db, session.user, loadId, parsed.data);
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not save the carrier." };
  }

  // Start live tracking with the assignment when asked (per-load opt-in —
  // MacroPoint bills per tracked load). A tracking failure is a soft note:
  // the carrier assignment itself must never roll back or read as failed.
  let notice: string | undefined;
  if (
    formData.get("startTracking") === "on" &&
    parsed.data.driverPhone &&
    !(await getLiveSessionForLoad(db, loadId))
  ) {
    try {
      await startTracking(db, session.user, loadId, { intervalMinutes: 30 });
    } catch (err) {
      notice = `Carrier saved, but tracking did not start: ${err instanceof Error ? err.message : "provider error"}`;
    }
  }

  refreshLoadPages(loadId);
  return { fieldErrors: {}, formError: null, ok: true, notice };
}

// ---------------------------------------------------------------------------
// Delay / exception surfacing

/** Flag the load delayed (reason + optional revised ETA); emails the shipper. */
export async function setDelayAction(
  loadId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();

  const parsed = delaySchema.safeParse({
    reason: formData.get("reason") ?? "",
    revisedDeliveryDate: formData.get("revisedDeliveryDate") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, formError: "Fix the highlighted fields." };
  }

  let result;
  try {
    result = await setLoadDelay(db, session.user, loadId, parsed.data);
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not flag the delay." };
  }

  try {
    await deliver(
      composeDelaySet({
        to: result.requesterEmail,
        reference: result.reference,
        loadId,
        reason: result.reason,
        revisedDeliveryDate: result.revisedDeliveryDate,
      }),
    );
  } catch (err) {
    console.error("delay email failed", err);
  }

  refreshLoadPages(loadId);
  return { fieldErrors: {}, formError: null, ok: true };
}

/** Clear the delay flag; emails the shipper it's back on schedule. */
export async function clearDelayAction(
  loadId: string,
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();

  let result;
  try {
    result = await clearLoadDelay(db, session.user, loadId);
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not clear the delay." };
  }

  try {
    await deliver(
      composeDelayCleared({
        to: result.requesterEmail,
        reference: result.reference,
        loadId,
      }),
    );
  } catch (err) {
    console.error("delay-cleared email failed", err);
  }

  refreshLoadPages(loadId);
  return { fieldErrors: {}, formError: null, ok: true };
}

// ---------------------------------------------------------------------------
// Invoices

/** Issue the load's invoice (delivered → invoiced happens inside
 * createInvoice); the invoice email replaces the generic status email. */
export async function createInvoiceAction(
  loadId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();

  const parsed = createInvoiceSchema.safeParse({
    amountUsd: formData.get("amountUsd") ?? "",
    dueDate: formData.get("dueDate") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, formError: "Fix the highlighted fields." };
  }

  let result;
  try {
    result = await createInvoice(db, session.user, loadId, parsed.data);
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not create the invoice." };
  }

  try {
    await deliver(
      composeInvoiceIssued({
        to: result.requesterEmail,
        reference: result.reference,
        loadId,
        number: result.number,
        amountUsd: result.amountUsd,
        dueDate: result.dueDate,
      }),
    );
  } catch (err) {
    console.error("invoice email failed", err);
  }

  refreshLoadPages(loadId);
  revalidatePath("/invoices");
  return { fieldErrors: {}, formError: null, ok: true };
}

/** Record payment on the load's invoice. */
export async function markInvoicePaidAction(
  invoiceId: string,
  loadId: string,
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();

  try {
    await markInvoicePaid(db, session.user, invoiceId);
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not mark it paid." };
  }

  refreshLoadPages(loadId);
  revalidatePath("/invoices");
  return { fieldErrors: {}, formError: null, ok: true };
}

// ---------------------------------------------------------------------------
// Live tracking (Phase 6)

const startTrackingSchema = z.object({
  intervalMinutes: z.coerce.number().int().min(5).max(240),
});

export async function startTrackingAction(
  loadId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();
  const parsed = startTrackingSchema.safeParse({
    intervalMinutes: formData.get("intervalMinutes") ?? "30",
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, formError: null };
  }
  try {
    await startTracking(db, session.user, loadId, parsed.data);
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not start tracking." };
  }
  refreshLoadPages(loadId);
  return { fieldErrors: {}, formError: null, ok: true };
}

export async function stopTrackingAction(
  loadId: string,
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();
  try {
    await stopTracking(db, session.user, loadId);
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not stop tracking." };
  }
  refreshLoadPages(loadId);
  return { fieldErrors: {}, formError: null, ok: true };
}

/** Rotate the public token. Anyone holding the old link loses access now. */
export async function revokeTrackingLinkAction(
  sessionId: string,
  loadId: string,
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();
  try {
    await revokePublicLink(db, session.user, sessionId);
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not revoke the link." };
  }
  refreshLoadPages(loadId);
  return { fieldErrors: {}, formError: null, ok: true };
}

/** Email the shipper the public tracking link (logged on the timeline). */
export async function sendTrackingLinkAction(
  loadId: string,
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();
  try {
    const detail = await getLoadForAdmin(db, session.user, loadId);
    if (!detail) throw new Error("Load not found");
    const tracking = await getTrackingForAdmin(db, session.user, loadId);
    if (!tracking || ["stopped", "error"].includes(tracking.session.status)) {
      throw new Error("No live tracking session on this load");
    }
    await sendEmail({
      to: detail.requesterEmail,
      subject: `Live tracking for ${detail.load.reference}`,
      text: [
        `Follow your freight live on a map: ${trackingPublicUrl(tracking.session.publicToken)}`,
        "",
        `Anyone you share the link with can watch — no login needed. It stays live until ${PUBLIC_LINK_TTL_DAYS} days after delivery.`,
        "",
        "Peer Freight",
      ].join("\n"),
    });
    await appendEvent(db, {
      organizationId: detail.load.organizationId,
      quoteRequestId: detail.load.quoteRequestId,
      loadId,
      actorType: "admin",
      actorId: session.user.id,
      eventType: "tracking_link_sent",
      payload: { sessionId: tracking.session.id, to: detail.requesterEmail },
    });
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not send the link." };
  }
  refreshLoadPages(loadId);
  return { fieldErrors: {}, formError: null, ok: true };
}

const manualPingSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

/** Dev/demo fallback and the answer to drivers who refuse the app: the desk
 * keys in a position from a check call. */
export async function recordManualPingAction(
  loadId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const { session, db } = await requireAdminSession();
  const parsed = manualPingSchema.safeParse({
    lat: formData.get("lat") ?? "",
    lng: formData.get("lng") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, formError: "Latitude and longitude, decimal degrees." };
  }
  try {
    const live = await getLiveSessionForLoad(db, loadId);
    if (!live) throw new Error("No live tracking session on this load");
    await recordPing(db, live, {
      kind: "ping",
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      recordedAt: new Date(),
      city: null,
      state: null,
      etaAt: null,
      providerStatus: null,
      providerEventId: null,
      source: "manual",
    });
  } catch (err) {
    return { fieldErrors: {}, formError: err instanceof Error ? err.message : "Could not record the ping." };
  }
  refreshLoadPages(loadId);
  return { fieldErrors: {}, formError: null, ok: true };
}
