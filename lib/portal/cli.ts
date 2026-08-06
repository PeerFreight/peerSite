import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { parseArgs, type ParseArgsConfig } from "node:util";
import { asc, eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import {
  addDocument,
  bookLoad,
  clearLoadDelay,
  createInvoice,
  getQuoteRequestForAdmin,
  listLoadsForAdmin,
  listOpenQuoteRequests,
  markInvoicePaid,
  requestInfo,
  sendQuote,
  sendShipperUpdate,
  setDocumentVisibility,
  setLoadDelay,
  setLoadStatus,
  upsertCarrierAssignment,
  getLoadForAdmin,
  type AdminUser,
} from "@/lib/portal/admin-queries";
import { carrierAssignmentSchema } from "@/lib/portal/carrier";
import { DOCUMENT_TYPE_LABELS, documentMetaSchema } from "@/lib/portal/documents";
import { createInvoiceSchema } from "@/lib/portal/invoices";
import { delaySchema, LOAD_STATUSES_HELP, LOAD_STATUS_LABELS } from "@/lib/portal/loads";
import {
  composeCustomUpdate,
  composeDelayCleared,
  composeDelaySet,
  composeDocumentShared,
  composeInviteEmail,
  composeInvoiceIssued,
  composeLoadBooked,
  composeLoadStatus,
  composeNeedsInfo,
  composeQuoteSent,
  deliver,
  type ComposedEmail,
} from "@/lib/portal/notify";
import { needsInfoSchema, sendQuoteSchema, hazmatSummary, laneSummary } from "@/lib/portal/rfq";
import { assertAdmin } from "@/lib/portal/roles";
import {
  cancelInvitationAsAdmin,
  inviteTeammateAsAdmin,
  INVITABLE_ROLES,
  type InvitableRole,
} from "@/lib/portal/team";
import { appendEvent, type PortalDb } from "@/lib/portal/queries";
import { documentPath, getStorage } from "@/lib/storage";

/**
 * Agent command layer: every founder-side portal operation as a headless
 * command. The founders' AI agents drive this ("send the quote over to
 * Dana"), the client gets the same email the web action would have sent,
 * and every mutation lands on the append-only timeline with `via: "agent"`
 * in the payload. Authentication is DB access (DATABASE_URL), same trust
 * level as scripts/migrate.ts — revisit before a production deploy.
 *
 * Pure command core: scripts/portal-cli.ts owns process/IO concerns.
 */

export type CliResult = {
  /** Human-readable output (default). */
  text: string;
  /** Machine-readable payload (--json). */
  json: unknown;
  /** Every email this command sent, exactly as composed. */
  emails: ComposedEmail[];
};

/** Look the actor up by email and prove the admin role; the CLI always
 * stamps `via: "agent"` — the founder is the actor, the agent is a channel. */
export async function resolveActor(db: PortalDb, email: string): Promise<AdminUser> {
  const rows = await db
    .select({ id: schema.user.id, email: schema.user.email, emailVerified: schema.user.emailVerified })
    .from(schema.user)
    .where(eq(schema.user.email, email.toLowerCase()))
    .limit(1);
  const user = rows[0];
  if (!user) throw new Error(`No portal account for ${email}`);
  const actor: AdminUser = { ...user, via: "agent" };
  assertAdmin(actor);
  return actor;
}

/** Accept PEER-1001, peer1001, 1001, or a raw uuid; return the admin detail. */
export async function resolveLoad(db: PortalDb, admin: AdminUser, refOrId: string) {
  let id = refOrId;
  const refMatch = /^(?:peer-?)?(\d+)$/i.exec(refOrId.trim());
  if (refMatch) {
    const reference = `PEER-${refMatch[1]}`;
    const rows = await db
      .select({ id: schema.loads.id })
      .from(schema.loads)
      .where(eq(schema.loads.reference, reference))
      .limit(1);
    if (!rows[0]) throw new Error(`No load ${reference}`);
    id = rows[0].id;
  }
  const detail = await getLoadForAdmin(db, admin, id);
  if (!detail) throw new Error(`No load ${refOrId}`);
  return detail;
}

// ---------------------------------------------------------------------------
// Formatting helpers (text mode)

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
});

function fmtWhen(d: Date) {
  return `${dateTimeFmt.format(d)} PT`;
}

function fmtMoney(v: string | number) {
  return `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function table(headers: string[], rows: string[][]): string {
  const all = [headers, ...rows];
  const widths = headers.map((_, i) => Math.max(...all.map((r) => (r[i] ?? "").length)));
  const line = (r: string[]) => r.map((c, i) => (c ?? "").padEnd(widths[i])).join("  ").trimEnd();
  return [line(headers), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n");
}

function eventLine(e: {
  createdAt: Date;
  eventType: string;
  actorType: string;
  payload: Record<string, unknown> | null;
}) {
  const p = e.payload ?? {};
  const bits: string[] = [];
  if (typeof p.note === "string") bits.push(`note: ${p.note}`);
  if (typeof p.message === "string") bits.push(p.message);
  if (typeof p.reason === "string") bits.push(p.reason);
  if (typeof p.subject === "string") bits.push(`"${p.subject}"`);
  if (typeof p.number === "string") bits.push(p.number);
  if (typeof p.label === "string") bits.push(String(p.label));
  if (typeof p.email === "string") bits.push(String(p.email));
  const via = p.via === "agent" ? " [via agent]" : "";
  return `${fmtWhen(e.createdAt)}  ${e.eventType}${via} (${e.actorType})${bits.length ? `  · ${bits.join(" · ")}` : ""}`;
}

function delayLine(load: {
  delayedAt: Date | null;
  delayReason: string | null;
  revisedDeliveryDate: string | null;
}) {
  if (!load.delayedAt) return null;
  return `DELAYED since ${fmtWhen(load.delayedAt)}: ${load.delayReason}${
    load.revisedDeliveryDate ? ` (revised ETA ${load.revisedDeliveryDate})` : ""
  }`;
}

// ---------------------------------------------------------------------------
// Command registry

type Ctx = { db: PortalDb; admin: AdminUser };
type Command = {
  usage: string;
  describe: string;
  options?: ParseArgsConfig["options"];
  positionals?: string;
  run: (ctx: Ctx, positionals: string[], values: Record<string, unknown>) => Promise<CliResult>;
};

function str(values: Record<string, unknown>, key: string): string | undefined {
  const v = values[key];
  return typeof v === "string" ? v : undefined;
}

function need(values: Record<string, unknown>, key: string): string {
  const v = str(values, key);
  if (!v) throw new Error(`--${key} is required`);
  return v;
}

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".txt": "text/plain",
  ".csv": "text/csv",
};

/** Read a local file for upload; content type by extension. */
function readUpload(filePath: string) {
  const bytes = readFileSync(filePath);
  return {
    bytes,
    filename: basename(filePath),
    contentType: CONTENT_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream",
  };
}

/** Compose the status email exactly like the web action: the carrier's
 * tracking link (MacroPoint share link) rides along on dispatch/in-transit
 * once the carrier card is shipper-visible. */
async function statusEmailAndSideEffects(
  ctx: Ctx,
  loadId: string,
  next: schema.LoadStatus,
  result: { reference: string; requesterEmail: string; note: string | null },
) {
  const extraLines: string[] = [];
  if (["dispatched", "in_transit"].includes(next)) {
    try {
      const detail = await getLoadForAdmin(ctx.db, ctx.admin, loadId);
      const url = detail?.carrier?.visibleToShipper ? detail.carrier.trackingUrl : null;
      if (url) extraLines.push(`Track your delivery: ${url}`);
    } catch (err) {
      console.error("tracking link lookup failed", err);
    }
  }
  return deliver(
    composeLoadStatus({
      to: result.requesterEmail,
      reference: result.reference,
      loadId,
      next: next as Exclude<schema.LoadStatus, "booked">,
      note: result.note,
      extraLines,
    }),
  );
}

const COMMANDS: Record<string, Command> = {
  rfqs: {
    usage: "rfqs",
    describe: "Open quote requests across all orgs, longest-waiting first",
    run: async ({ db, admin }) => {
      const rows = await listOpenQuoteRequests(db, admin);
      const text =
        rows.length === 0
          ? "No open quote requests."
          : table(
              ["ID", "ORG", "LANE", "EQUIPMENT", "PICKUP", "STATUS", "SUBMITTED"],
              rows.map((r) => [
                r.id,
                r.orgName,
                laneSummary(r),
                r.equipment + (r.hazmat ? ` (hazmat${r.hazmatClass ? ` ${r.hazmatClass}` : ""})` : ""),
                r.pickupDate,
                r.status,
                fmtWhen(r.createdAt),
              ]),
            );
      return { text, json: rows, emails: [] };
    },
  },

  rfq: {
    usage: "rfq <rfqId>",
    describe: "Full detail for one quote request",
    positionals: "<rfqId>",
    run: async ({ db, admin }, [rfqId]) => {
      if (!rfqId) throw new Error("Usage: rfq <rfqId>");
      const d = await getQuoteRequestForAdmin(db, admin, rfqId);
      if (!d) throw new Error(`No quote request ${rfqId}`);
      const r = d.request;
      const lines = [
        `RFQ ${r.id} · ${r.status}`,
        `${d.orgName} · ${d.requesterName} (${d.requesterEmail})`,
        `Lane: ${laneSummary(r)} · pickup ${r.pickupDate}${r.pickupWindow ? ` (${r.pickupWindow})` : ""} · delivery ${r.deliveryDate}${r.deliveryWindow ? ` (${r.deliveryWindow})` : ""}`,
        `Freight: ${r.commodity} · ${r.weightLbs.toLocaleString("en-US")} lbs · ${r.pieces} · ${r.equipment}${r.temperatureF ? ` at ${r.temperatureF}F` : ""}`,
        r.hazmat ? `Hazmat: ${hazmatSummary(r)}` : null,
        r.accessorials.length ? `Services: ${r.accessorials.join(", ")}` : null,
        r.targetRateUsd ? `Target rate: ${fmtMoney(r.targetRateUsd)}` : null,
        r.notes ? `Notes: ${r.notes}` : null,
        r.needsInfoMessage ? `Last needs-info ask: ${r.needsInfoMessage}` : null,
        d.quotes.length
          ? `Quotes:\n${d.quotes.map((q) => `  ${q.id} · ${fmtMoney(q.allInRateUsd)} · ${q.status}${q.validUntil ? ` · valid until ${q.validUntil.toISOString().slice(0, 10)}` : ""}`).join("\n")}`
          : "Quotes: none yet",
        d.loads.length
          ? `Loads: ${d.loads.map((l) => `${l.reference} (${l.status})`).join(", ")}`
          : null,
        "",
        "Timeline:",
        ...d.events.map(eventLine).map((l) => `  ${l}`),
      ].filter((l): l is string => l !== null);
      return { text: lines.join("\n"), json: d, emails: [] };
    },
  },

  loads: {
    usage: "loads",
    describe: "All loads across orgs, active first",
    run: async ({ db, admin }) => {
      const rows = await listLoadsForAdmin(db, admin);
      const text =
        rows.length === 0
          ? "No loads."
          : table(
              ["REF", "ORG", "LANE", "STATUS", "PICKUP", "DELIVERY", "FLAGS"],
              rows.map((l) => [
                l.reference,
                l.orgName,
                laneSummary(l),
                l.status,
                l.pickupDate,
                l.deliveryDate,
                [l.delayedAt ? "DELAYED" : null, l.hazmat ? "hazmat" : null]
                  .filter(Boolean)
                  .join(", "),
              ]),
            );
      return { text, json: rows, emails: [] };
    },
  },

  load: {
    usage: "load <ref>",
    describe: "Full detail for one load (PEER-nnnn or id)",
    positionals: "<ref>",
    run: async (ctx, [ref]) => {
      if (!ref) throw new Error("Usage: load <ref>");
      const d = await resolveLoad(ctx.db, ctx.admin, ref);
      const l = d.load;
      const delay = delayLine(l);
      const lines = [
        `${l.reference} · ${laneSummary(l)} · ${LOAD_STATUS_LABELS[l.status]}`,
        delay,
        `${d.orgName} · ${d.requesterName} (${d.requesterEmail})`,
        `Pickup ${l.pickupDate}${l.pickupWindow ? ` (${l.pickupWindow})` : ""} · Delivery ${l.deliveryDate}${l.deliveryWindow ? ` (${l.deliveryWindow})` : ""}`,
        `Freight: ${l.commodity} · ${l.weightLbs.toLocaleString("en-US")} lbs · ${l.pieces} · ${l.equipment}`,
        `Rate: ${fmtMoney(l.allInRateUsd)} all-in`,
        d.carrier
          ? `Carrier: ${d.carrier.carrierName}${d.carrier.mcNumber ? ` (${d.carrier.mcNumber})` : ""}${d.carrier.driverName ? ` · ${d.carrier.driverName}` : ""}${d.carrier.driverPhone ? ` · ${d.carrier.driverPhone}` : ""}${d.carrier.visibleToShipper ? " · shared" : " · internal"}`
          : "Carrier: none assigned",
        d.invoice
          ? `Invoice: ${d.invoice.number} · ${fmtMoney(d.invoice.amountUsd)} · due ${d.invoice.dueDate} · ${d.invoice.status}`
          : "Invoice: none",
        d.documents.length
          ? `Documents:\n${d.documents.map((doc) => `  ${doc.id} · ${DOCUMENT_TYPE_LABELS[doc.type]} · ${doc.filename} · ${doc.visibleToShipper ? "shared" : "internal"}`).join("\n")}`
          : "Documents: none",
        "",
        "Timeline:",
        ...d.events.map(eventLine).map((x) => `  ${x}`),
      ].filter((x): x is string => x !== null);
      return { text: lines.join("\n"), json: d, emails: [] };
    },
  },

  timeline: {
    usage: "timeline <ref>",
    describe: "Event timeline for one load",
    positionals: "<ref>",
    run: async (ctx, [ref]) => {
      if (!ref) throw new Error("Usage: timeline <ref>");
      const d = await resolveLoad(ctx.db, ctx.admin, ref);
      return {
        text: [`${d.load.reference} timeline:`, ...d.events.map(eventLine).map((l) => `  ${l}`)].join("\n"),
        json: d.events,
        emails: [],
      };
    },
  },

  orgs: {
    usage: "orgs",
    describe: "Customer organizations with slugs and members",
    run: async ({ db, admin }) => {
      assertAdmin(admin);
      const rows = await db
        .select({
          id: schema.organization.id,
          name: schema.organization.name,
          slug: schema.organization.slug,
          memberCount: sql<number>`count(${schema.member.id})`,
        })
        .from(schema.organization)
        .leftJoin(schema.member, eq(schema.member.organizationId, schema.organization.id))
        .groupBy(schema.organization.id)
        .orderBy(asc(schema.organization.name));
      const text =
        rows.length === 0
          ? "No organizations."
          : table(
              ["SLUG", "NAME", "MEMBERS", "ID"],
              rows.map((o) => [o.slug ?? "", o.name, String(o.memberCount), o.id]),
            );
      return { text, json: rows, emails: [] };
    },
  },

  "send-quote": {
    usage: "send-quote <rfqId> --rate 1850 --service \"...\" [--exclusions \"...\"] [--valid-until YYYY-MM-DD] [--note \"how we priced it\"]",
    describe: "Send the shipper-facing quote (emails the requester)",
    positionals: "<rfqId>",
    options: {
      rate: { type: "string" },
      service: { type: "string" },
      exclusions: { type: "string" },
      "valid-until": { type: "string" },
      note: { type: "string" },
    },
    run: async ({ db, admin }, [rfqId], values) => {
      if (!rfqId) throw new Error("Usage: send-quote <rfqId> --rate --service ...");
      const input = sendQuoteSchema.parse({
        allInRateUsd: need(values, "rate"),
        serviceDescription: need(values, "service"),
        exclusions: str(values, "exclusions") ?? "",
        validUntil: str(values, "valid-until") ?? "",
        note: str(values, "note") ?? "",
      });
      const result = await sendQuote(db, admin, rfqId, input);
      const email = await deliver(
        composeQuoteSent({
          to: result.requesterEmail,
          requestId: rfqId,
          allInRateUsd: input.allInRateUsd,
          serviceDescription: input.serviceDescription,
          exclusions: input.exclusions,
          validUntil: input.validUntil,
          note: input.note,
        }),
      );
      return {
        text: `Quote sent: ${fmtMoney(input.allInRateUsd)} all-in to ${result.orgName} (${result.requesterEmail}). Quote id ${result.quoteId}. Book it once they accept.`,
        json: { ...result, input },
        emails: [email],
      };
    },
  },

  "needs-info": {
    usage: "needs-info <rfqId> --message \"one consolidated ask\"",
    describe: "Ask the shipper for missing details (emails the requester)",
    positionals: "<rfqId>",
    options: { message: { type: "string" } },
    run: async ({ db, admin }, [rfqId], values) => {
      if (!rfqId) throw new Error("Usage: needs-info <rfqId> --message ...");
      const { message } = needsInfoSchema.parse({ message: need(values, "message") });
      const result = await requestInfo(db, admin, rfqId, message);
      const email = await deliver(
        composeNeedsInfo({ to: result.requesterEmail, requestId: rfqId, message }),
      );
      return {
        text: `Marked needs-info and emailed ${result.requesterEmail}.`,
        json: result,
        emails: [email],
      };
    },
  },

  book: {
    usage: "book <quoteId>",
    describe: "Book the load off an accepted quote (emails the confirmation)",
    positionals: "<quoteId>",
    run: async ({ db, admin }, [quoteId]) => {
      if (!quoteId) throw new Error("Usage: book <quoteId>");
      const result = await bookLoad(db, admin, quoteId);
      const email = await deliver(
        composeLoadBooked({
          to: result.requesterEmail,
          reference: result.reference,
          loadId: result.loadId,
        }),
      );
      return {
        text: `Booked ${result.reference} for ${result.orgName}. Load id ${result.loadId}.`,
        json: result,
        emails: [email],
      };
    },
  },

  "set-status": {
    usage: `set-status <ref> <${LOAD_STATUSES_HELP}> [--note "context for the shipper"]`,
    describe: "Walk the load one legal lifecycle step (emails the shipper)",
    positionals: "<ref> <status>",
    options: { note: { type: "string" } },
    run: async (ctx, [ref, status], values) => {
      if (!ref || !status) throw new Error("Usage: set-status <ref> <status>");
      if (!(schema.LOAD_STATUSES as readonly string[]).includes(status)) {
        throw new Error(`Unknown status "${status}". One of: ${LOAD_STATUSES_HELP}`);
      }
      const next = status as schema.LoadStatus;
      const detail = await resolveLoad(ctx.db, ctx.admin, ref);
      const result = await setLoadStatus(ctx.db, ctx.admin, detail.load.id, next, {
        note: str(values, "note"),
      });
      const email = await statusEmailAndSideEffects(ctx, detail.load.id, next, result);
      return {
        text: `${result.reference}: ${result.from} → ${result.to}. Shipper emailed.`,
        json: result,
        emails: [email],
      };
    },
  },

  "add-doc": {
    usage: "add-doc <ref> --file ./pod.pdf --type pod [--share] [--note \"...\"]",
    describe: "Upload a document onto a load; --share posts + emails it",
    positionals: "<ref>",
    options: {
      file: { type: "string" },
      type: { type: "string" },
      share: { type: "boolean" },
      note: { type: "string" },
    },
    run: async (ctx, [ref], values) => {
      if (!ref) throw new Error("Usage: add-doc <ref> --file --type ...");
      const meta = documentMetaSchema.parse({
        type: need(values, "type"),
        visibleToShipper: values.share === true,
      });
      const upload = readUpload(need(values, "file"));
      const detail = await resolveLoad(ctx.db, ctx.admin, ref);
      const docId = crypto.randomUUID();
      const storagePath = documentPath(
        detail.load.organizationId,
        detail.load.id,
        docId,
        upload.filename,
      );
      await getStorage().put(storagePath, upload.bytes, upload.contentType);
      const result = await addDocument(ctx.db, ctx.admin, detail.load.id, {
        type: meta.type,
        filename: upload.filename,
        contentType: upload.contentType,
        sizeBytes: upload.bytes.length,
        storagePath,
        visibleToShipper: meta.visibleToShipper,
      });
      const emails: ComposedEmail[] = [];
      if (meta.visibleToShipper) {
        emails.push(
          await deliver(
            composeDocumentShared({
              to: result.requesterEmail,
              reference: result.reference,
              loadId: detail.load.id,
              typeLabel: DOCUMENT_TYPE_LABELS[meta.type],
              note: str(values, "note"),
            }),
          ),
        );
      }
      return {
        text: `${DOCUMENT_TYPE_LABELS[meta.type]} "${upload.filename}" on ${result.reference} (${meta.visibleToShipper ? "shared, shipper emailed" : "internal"}). Document id ${result.documentId}.`,
        json: result,
        emails,
      };
    },
  },

  "share-doc": {
    usage: "share-doc <documentId> [--hide] [--note \"...\"]",
    describe: "Share (or hide) an uploaded document; sharing emails the shipper",
    positionals: "<documentId>",
    options: { hide: { type: "boolean" }, note: { type: "string" } },
    run: async ({ db, admin }, [docId], values) => {
      if (!docId) throw new Error("Usage: share-doc <documentId>");
      const visible = values.hide !== true;
      const row = await setDocumentVisibility(db, admin, docId, visible);
      const emails: ComposedEmail[] = [];
      if (visible) {
        const detail = await getLoadForAdmin(db, admin, row.doc.loadId);
        if (detail) {
          emails.push(
            await deliver(
              composeDocumentShared({
                to: detail.requesterEmail,
                reference: detail.load.reference,
                loadId: row.doc.loadId,
                typeLabel: DOCUMENT_TYPE_LABELS[row.doc.type],
                note: str(values, "note"),
              }),
            ),
          );
        }
      }
      return {
        text: `${row.doc.filename} is now ${visible ? "shared with the shipper (emailed)" : "internal"}.`,
        json: { documentId: docId, visibleToShipper: visible },
        emails,
      };
    },
  },

  "assign-carrier": {
    usage: "assign-carrier <ref> --name \"Carrier LLC\" [--mc MC-123456] [--driver \"R. Alvarez\"] [--phone \"(555) 555-0100\"] [--truck 204] [--trailer 5311] [--tracking-url https://...] [--share]",
    describe: "Assign or update the load's carrier (no shipper email; dispatch is the news). --tracking-url takes the MacroPoint share link",
    positionals: "<ref>",
    options: {
      name: { type: "string" },
      mc: { type: "string" },
      driver: { type: "string" },
      phone: { type: "string" },
      truck: { type: "string" },
      trailer: { type: "string" },
      "tracking-url": { type: "string" },
      share: { type: "boolean" },
    },
    run: async (ctx, [ref], values) => {
      if (!ref) throw new Error("Usage: assign-carrier <ref> --name ...");
      const input = carrierAssignmentSchema.parse({
        carrierName: need(values, "name"),
        mcNumber: str(values, "mc") ?? "",
        driverName: str(values, "driver") ?? "",
        driverPhone: str(values, "phone") ?? "",
        truckNumber: str(values, "truck") ?? "",
        trailerNumber: str(values, "trailer") ?? "",
        trackingUrl: str(values, "tracking-url") ?? "",
        visibleToShipper: values.share === true,
      });
      const detail = await resolveLoad(ctx.db, ctx.admin, ref);
      const result = await upsertCarrierAssignment(ctx.db, ctx.admin, detail.load.id, input);
      return {
        text: `Carrier ${result.updated ? "updated" : "assigned"} on ${result.reference}: ${input.carrierName}${input.visibleToShipper ? " (visible to shipper)" : " (internal)"}.`,
        json: result,
        emails: [],
      };
    },
  },

  "set-delay": {
    usage: "set-delay <ref> --reason \"Breakdown near Sacramento\" [--new-eta YYYY-MM-DD]",
    describe: "Flag the load delayed (emails the shipper)",
    positionals: "<ref>",
    options: { reason: { type: "string" }, "new-eta": { type: "string" } },
    run: async (ctx, [ref], values) => {
      if (!ref) throw new Error("Usage: set-delay <ref> --reason ...");
      const input = delaySchema.parse({
        reason: need(values, "reason"),
        revisedDeliveryDate: str(values, "new-eta") ?? "",
      });
      const detail = await resolveLoad(ctx.db, ctx.admin, ref);
      const result = await setLoadDelay(ctx.db, ctx.admin, detail.load.id, input);
      const email = await deliver(
        composeDelaySet({
          to: result.requesterEmail,
          reference: result.reference,
          loadId: detail.load.id,
          reason: result.reason,
          revisedDeliveryDate: result.revisedDeliveryDate,
        }),
      );
      return {
        text: `${result.reference} flagged delayed${result.revisedDeliveryDate ? ` (revised ETA ${result.revisedDeliveryDate})` : ""}. Shipper emailed.`,
        json: result,
        emails: [email],
      };
    },
  },

  "clear-delay": {
    usage: "clear-delay <ref>",
    describe: "Clear the delay flag (emails the shipper it's back on schedule)",
    positionals: "<ref>",
    run: async (ctx, [ref]) => {
      if (!ref) throw new Error("Usage: clear-delay <ref>");
      const detail = await resolveLoad(ctx.db, ctx.admin, ref);
      const result = await clearLoadDelay(ctx.db, ctx.admin, detail.load.id);
      const email = await deliver(
        composeDelayCleared({
          to: result.requesterEmail,
          reference: result.reference,
          loadId: detail.load.id,
        }),
      );
      return {
        text: `${result.reference} back on schedule. Shipper emailed.`,
        json: result,
        emails: [email],
      };
    },
  },

  "create-invoice": {
    usage: "create-invoice <ref> --due YYYY-MM-DD [--amount 1850.00] [--file ./invoice.pdf]",
    describe: "Issue the load's invoice (delivered → invoiced; emails the shipper)",
    positionals: "<ref>",
    options: {
      due: { type: "string" },
      amount: { type: "string" },
      file: { type: "string" },
    },
    run: async (ctx, [ref], values) => {
      if (!ref) throw new Error("Usage: create-invoice <ref> --due ...");
      const input = createInvoiceSchema.parse({
        amountUsd: str(values, "amount") ?? "",
        dueDate: need(values, "due"),
      });
      const detail = await resolveLoad(ctx.db, ctx.admin, ref);

      // Optional PDF rides along as a shared invoice document; the invoice
      // email is the announcement, so no separate document email.
      let documentId: string | null = null;
      const filePath = str(values, "file");
      if (filePath) {
        const upload = readUpload(filePath);
        const docId = crypto.randomUUID();
        const storagePath = documentPath(
          detail.load.organizationId,
          detail.load.id,
          docId,
          upload.filename,
        );
        await getStorage().put(storagePath, upload.bytes, upload.contentType);
        const added = await addDocument(ctx.db, ctx.admin, detail.load.id, {
          type: "invoice",
          filename: upload.filename,
          contentType: upload.contentType,
          sizeBytes: upload.bytes.length,
          storagePath,
          visibleToShipper: true,
        });
        documentId = added.documentId;
      }

      const result = await createInvoice(ctx.db, ctx.admin, detail.load.id, {
        amountUsd: input.amountUsd,
        dueDate: input.dueDate,
        documentId,
      });
      const email = await deliver(
        composeInvoiceIssued({
          to: result.requesterEmail,
          reference: result.reference,
          loadId: result.loadId,
          number: result.number,
          amountUsd: result.amountUsd,
          dueDate: result.dueDate,
        }),
      );
      return {
        text: `${result.number} issued on ${result.reference}: ${fmtMoney(result.amountUsd)} due ${result.dueDate}. Shipper emailed.`,
        json: result,
        emails: [email],
      };
    },
  },

  "mark-paid": {
    usage: "mark-paid <INV-nnnn>",
    describe: "Record payment on an invoice",
    positionals: "<invoice>",
    run: async ({ db, admin }, [inv]) => {
      if (!inv) throw new Error("Usage: mark-paid <INV-nnnn>");
      const result = await markInvoicePaid(db, admin, inv);
      return {
        text: `${result.number} on ${result.reference} marked paid.`,
        json: result,
        emails: [],
      };
    },
  },

  invite: {
    usage: "invite <email> --org <slug> [--role member|admin]",
    describe: "Invite a teammate into a customer org (emails the invite link)",
    positionals: "<email>",
    options: { org: { type: "string" }, role: { type: "string" } },
    run: async ({ db, admin }, [email], values) => {
      if (!email) throw new Error("Usage: invite <email> --org <slug>");
      const slug = need(values, "org");
      const role = (str(values, "role") ?? "member") as InvitableRole;
      if (!INVITABLE_ROLES.includes(role)) {
        throw new Error(`--role must be one of: ${INVITABLE_ROLES.join(", ")}`);
      }
      const orgs = await db
        .select({ id: schema.organization.id, name: schema.organization.name })
        .from(schema.organization)
        .where(eq(schema.organization.slug, slug))
        .limit(1);
      if (!orgs[0]) throw new Error(`No organization with slug "${slug}" (see: orgs)`);
      const result = await inviteTeammateAsAdmin(db, admin, orgs[0].id, email, role);
      const composed = await deliver(
        composeInviteEmail({
          to: result.email,
          orgName: result.orgName,
          inviterName: null,
          inviteId: result.invitationId,
        }),
      );
      return {
        text: `Invited ${result.email} to ${result.orgName} as ${role}. Expires ${result.expiresAt.toISOString().slice(0, 10)}.`,
        json: result,
        emails: [composed],
      };
    },
  },

  "cancel-invite": {
    usage: "cancel-invite <email-or-invitationId>",
    describe: "Cancel a pending teammate invitation (the invite link stops working)",
    positionals: "<email-or-invitationId>",
    run: async ({ db, admin }, [ref]) => {
      if (!ref) throw new Error("Usage: cancel-invite <email-or-invitationId>");
      const result = await cancelInvitationAsAdmin(db, admin, ref);
      return {
        text: `Invitation to ${result.email} (${result.orgName}) canceled; the invite link no longer works.`,
        json: result,
        emails: [],
      };
    },
  },

  "send-update": {
    usage: "send-update <ref> --subject \"...\" --body \"...\"",
    describe: "Free-form shipper update, emailed and recorded on the timeline",
    positionals: "<ref>",
    options: { subject: { type: "string" }, body: { type: "string" } },
    run: async (ctx, [ref], values) => {
      if (!ref) throw new Error("Usage: send-update <ref> --subject --body");
      const subject = need(values, "subject");
      const body = need(values, "body");
      const detail = await resolveLoad(ctx.db, ctx.admin, ref);
      const result = await sendShipperUpdate(ctx.db, ctx.admin, detail.load.id, { subject, body });
      const email = await deliver(
        composeCustomUpdate({
          to: result.requesterEmail,
          reference: result.reference,
          loadId: detail.load.id,
          subject,
          body,
        }),
      );
      return {
        text: `Update sent on ${result.reference} and recorded on the timeline.`,
        json: result,
        emails: [email],
      };
    },
  },
};

export function usageText(): string {
  const lines = [
    "Peer Freight portal CLI — founder desk operations, agent-drivable.",
    "",
    "Usage: npm run portal -- [--as founder@peer-freight.com] [--json] <command> ...",
    "Actor: --as or PORTAL_ACTOR (a verified @peer-freight.com account).",
    "",
    "Commands:",
    ...Object.values(COMMANDS).map((c) => `  ${c.usage}\n      ${c.describe}`),
  ];
  return lines.join("\n");
}

/** parseArgs reads "--lng -122.04" as two options because the value starts
 * with a dash; negative numbers must ride in the same token (--lng=-122.04).
 * Join them here so coordinates paste naturally. */
function joinNegativeNumberValues(args: string[], options: ParseArgsConfig["options"]) {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const name = arg.startsWith("--") && !arg.includes("=") ? arg.slice(2) : null;
    const next = args[i + 1];
    if (name && options?.[name]?.type === "string" && next && /^-\d/.test(next)) {
      out.push(`${arg}=${next}`);
      i++;
    } else {
      out.push(arg);
    }
  }
  return out;
}

export async function runCommand(
  db: PortalDb,
  admin: AdminUser,
  argv: string[],
): Promise<CliResult> {
  const [name, ...rest] = argv;
  if (!name || name === "help") return { text: usageText(), json: { commands: Object.keys(COMMANDS) }, emails: [] };
  const command = COMMANDS[name];
  if (!command) {
    throw new Error(`Unknown command "${name}". Run "help" for the command list.`);
  }
  const { positionals, values } = parseArgs({
    args: joinNegativeNumberValues(rest, command.options ?? {}),
    options: command.options ?? {},
    allowPositionals: true,
    strict: true,
  });
  return command.run({ db, admin }, positionals, values as Record<string, unknown>);
}
