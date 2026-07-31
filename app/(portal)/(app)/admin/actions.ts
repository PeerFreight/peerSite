"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { LoadStatus } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import {
  addDocument,
  bookLoad,
  getLoadForAdmin,
  requestInfo,
  sendQuote,
  setDocumentVisibility,
  setLoadStatus,
  upsertCarrierAssignment,
} from "@/lib/portal/admin-queries";
import { carrierAssignmentSchema } from "@/lib/portal/carrier";
import {
  DOCUMENT_TYPE_LABELS,
  documentMetaSchema,
  MAX_DOCUMENT_BYTES,
} from "@/lib/portal/documents";
import { LOAD_STATUS_EMAIL } from "@/lib/portal/loads";
import { needsInfoSchema, sendQuoteSchema } from "@/lib/portal/rfq";
import { requireAdminSession } from "@/lib/portal/session";
import { baseUrl } from "@/lib/portal/urls";
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

  const rate = Number(parsed.data.allInRateUsd).toLocaleString("en-US", { minimumFractionDigits: 2 });
  try {
    await sendEmail({
      to: result.requesterEmail,
      subject: "Your Peer Freight quote is ready",
      text: [
        `Your quote is ready: $${rate} all-in.`,
        "",
        parsed.data.serviceDescription,
        parsed.data.exclusions ? `\nNot included: ${parsed.data.exclusions}` : null,
        parsed.data.validUntil ? `\nThis quote is valid through ${parsed.data.validUntil}.` : null,
        "",
        `Review it here: ${baseUrl()}/quotes/${requestId}`,
        "",
        "Reply to this email to move forward or ask anything.",
        "",
        "Peer Freight",
      ]
        .filter((line) => line !== null)
        .join("\n"),
    });
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
    await sendEmail({
      to: result.requesterEmail,
      subject: "Quick questions before we quote your shipment",
      text: [
        "To finish pricing your quote request, we need a few more details:",
        "",
        parsed.data.message,
        "",
        `You can reply to this email, or update us here: ${baseUrl()}/quotes/${requestId}`,
        "",
        "Peer Freight",
      ].join("\n"),
    });
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
    await sendEmail({
      to: result.requesterEmail,
      subject: `Your load is booked: ${result.reference}`,
      text: [
        `Your load is booked. Reference ${result.reference} — quote it in any message about this shipment.`,
        "",
        "We are sourcing and vetting the carrier now. You will get an email when a carrier is dispatched, and its contact details will be on your load page.",
        "",
        `Track it here: ${baseUrl()}/loads/${result.loadId}`,
        "",
        "Peer Freight",
      ].join("\n"),
    });
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

  const email = LOAD_STATUS_EMAIL[next as Exclude<LoadStatus, "booked">];
  try {
    await sendEmail({
      to: result.requesterEmail,
      subject: email.subject(result.reference),
      text: [
        email.body,
        "",
        `Load page: ${baseUrl()}/loads/${loadId}`,
        "",
        "Peer Freight",
      ].join("\n"),
    });
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
      await sendEmail({
        to: result.requesterEmail,
        subject: `New document on ${result.reference}: ${DOCUMENT_TYPE_LABELS[parsedMeta.data.type]}`,
        text: [
          `A new document is posted on load ${result.reference}: ${DOCUMENT_TYPE_LABELS[parsedMeta.data.type]}.`,
          "",
          `Download it from your load page: ${baseUrl()}/loads/${loadId}`,
          "",
          "Peer Freight",
        ].join("\n"),
      });
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
        await sendEmail({
          to: detail.requesterEmail,
          subject: `New document on ${detail.load.reference}: ${DOCUMENT_TYPE_LABELS[row.doc.type]}`,
          text: [
            `A new document is posted on load ${detail.load.reference}: ${DOCUMENT_TYPE_LABELS[row.doc.type]}.`,
            "",
            `Download it from your load page: ${baseUrl()}/loads/${loadId}`,
            "",
            "Peer Freight",
          ].join("\n"),
        });
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
