import { z } from "zod";
import type { DocumentType } from "@/db/schema";

/** Document vocabulary + upload rules shared by the admin form and action. */

export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "rate_confirmation", label: "Rate confirmation" },
  { value: "bol", label: "Bill of lading" },
  { value: "pod", label: "Proof of delivery" },
  { value: "invoice", label: "Invoice" },
  { value: "other", label: "Other" },
];

export const DOCUMENT_TYPE_LABELS = Object.fromEntries(
  DOCUMENT_TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<DocumentType, string>;

/** Founders upload on the shipper's behalf in v1, so the gate is size and a
 * sane filename, not a content-type allowlist. */
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export const documentMetaSchema = z.object({
  type: z.enum(["rate_confirmation", "bol", "pod", "invoice", "other"]),
  visibleToShipper: z.boolean().default(false),
});

export function documentLabel(doc: { type: DocumentType; filename: string }) {
  return `${DOCUMENT_TYPE_LABELS[doc.type]} — ${doc.filename}`;
}
