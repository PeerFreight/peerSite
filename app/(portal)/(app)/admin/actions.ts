"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { LoadStatus } from "@/db/schema";
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
import { documentPath, getStorage } from "@/lib/storage";

export type AdminFormState = {
  fieldErrors: Record<string, string[] | undefined>;
  formError: string | null;
  ok?: boolean;
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

  // The dispatch / in-transit emails carry the carrier's tracking link (the
  // MacroPoint share link pasted on the assignment) once the carrier card is
  // shipper-visible.
  const extraLines: string[] = [];
  if (["dispatched", "in_transit"].includes(next)) {
    try {
      const detail = await getLoadForAdmin(db, session.user, loadId);
      const url = detail?.carrier?.visibleToShipper ? detail.carrier.trackingUrl : null;
      if (url) extraLines.push(`Track your delivery: ${url}`);
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

  refreshLoadPages(loadId);
  return { fieldErrors: {}, formError: null, ok: true };
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
