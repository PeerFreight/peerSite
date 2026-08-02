import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import * as schema from "@/db/schema";
import type { InvoiceStatus } from "@/db/schema";
import { requireMembership, type PortalDb } from "@/lib/portal/queries";

/**
 * Invoice vocabulary and the shipper-side (org-scoped) reads. Writes live in
 * lib/portal/admin-queries.ts (createInvoice / markInvoicePaid) — only the
 * desk issues invoices.
 */

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  open: "Open",
  paid: "Paid",
  void: "Void",
};

/** Admin create-invoice form. Amount blank = the load's agreed all-in rate. */
export const createInvoiceSchema = z.object({
  amountUsd: z
    .string()
    .trim()
    .regex(/^\$?\d{1,9}(\.\d{1,2})?$/, "Dollar amount like 1850 or 1850.00")
    .transform((v) => v.replace(/^\$/, ""))
    .nullish()
    .or(z.literal("").transform(() => null)),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a due date"),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/** All invoices for the org, newest first, with the load's ref and lane. */
export async function listInvoices(db: PortalDb, userId: string, orgId: string) {
  await requireMembership(db, userId, orgId);
  return db
    .select({
      id: schema.invoices.id,
      number: schema.invoices.number,
      amountUsd: schema.invoices.amountUsd,
      dueDate: schema.invoices.dueDate,
      status: schema.invoices.status,
      paidAt: schema.invoices.paidAt,
      createdAt: schema.invoices.createdAt,
      loadId: schema.loads.id,
      reference: schema.loads.reference,
      originCity: schema.loads.originCity,
      originState: schema.loads.originState,
      destCity: schema.loads.destCity,
      destState: schema.loads.destState,
    })
    .from(schema.invoices)
    .innerJoin(schema.loads, eq(schema.invoices.loadId, schema.loads.id))
    .where(eq(schema.invoices.organizationId, orgId))
    .orderBy(desc(schema.invoices.createdAt));
}

/** The load page's invoice block; null while the load has no invoice. */
export async function getInvoiceForLoad(
  db: PortalDb,
  userId: string,
  orgId: string,
  loadId: string,
) {
  await requireMembership(db, userId, orgId);
  const rows = await db
    .select()
    .from(schema.invoices)
    .where(and(eq(schema.invoices.loadId, loadId), eq(schema.invoices.organizationId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}
