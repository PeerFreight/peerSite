import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Better Auth core tables (drizzle adapter). Property names must match the
// Better Auth model fields; column names are ours (snake_case).

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("active_organization_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Better Auth organization plugin tables. A member row is the plan's
// "membership" (user↔org with a role).

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Better Auth's DB-backed rate-limit counters (rateLimit.storage:
 * "database" in lib/auth.ts) — the in-memory default is per-instance and
 * useless on serverless. Also reused by lib/portal/throttle.ts for the
 * unauthenticated form throttles, under its own key prefixes.
 * `lastRequest` is epoch milliseconds; rows are pruned by Better Auth. */
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

// Legacy of the pre-launch invite gate (lifted 2026-08 — signup is open).
// Kept as inert seed data rather than paying a drop migration.

export const allowedEmails = pgTable("allowed_emails", {
  email: text("email").primaryKey(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Portal domain tables (Phase 2). The portal is the shipper-facing view, not
// the operating record: no pricing internals (buy rates, margins, carrier
// costs) ever enter these tables.

export const QUOTE_REQUEST_STATUSES = [
  "submitted",
  "needs_info",
  "quoted",
  "accepted",
  "declined",
  "expired",
  "withdrawn",
] as const;
export type QuoteRequestStatus = (typeof QUOTE_REQUEST_STATUSES)[number];

/** Structured RFQ, one row per shipper request. Field set mirrors the tender
 * intake checklist in the first-load runbook. */
export const quoteRequests = pgTable(
  "quote_requests",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    status: text("status").$type<QuoteRequestStatus>().notNull().default("submitted"),

    // Lane
    originAddress: text("origin_address"),
    originCity: text("origin_city").notNull(),
    originState: text("origin_state").notNull(),
    originZip: text("origin_zip").notNull(),
    originHours: text("origin_hours"),
    originScheduling: text("origin_scheduling").notNull(), // appointment | fcfs
    destAddress: text("dest_address"),
    destCity: text("dest_city").notNull(),
    destState: text("dest_state").notNull(),
    destZip: text("dest_zip").notNull(),
    destHours: text("dest_hours"),
    destScheduling: text("dest_scheduling").notNull(), // appointment | fcfs

    // Schedule
    pickupDate: date("pickup_date").notNull(),
    pickupWindow: text("pickup_window"),
    deliveryDate: date("delivery_date").notNull(),
    deliveryWindow: text("delivery_window"),
    dateFlexibility: text("date_flexibility").notNull(), // exact | flexible

    // Freight
    commodity: text("commodity").notNull(),
    weightLbs: integer("weight_lbs").notNull(),
    pieces: text("pieces").notNull(), // e.g. "26 pallets", "400 cases on 20 pallets"
    dims: text("dims"),
    declaredValueUsd: numeric("declared_value_usd", { precision: 12, scale: 2 }),
    equipment: text("equipment").notNull(), // dry_van_53 | reefer | flatbed | other
    temperatureF: text("temperature_f"), // reefer set point
    equipmentNotes: text("equipment_notes"),
    hazmat: boolean("hazmat").notNull().default(false),
    // Structured hazmat block (migration 0007). UN number, shipping name,
    // and class are required by validation when hazmat is set; the rest are
    // shipping-paper details that never block a quote. `hazmatDetails` stays
    // as the free-text "anything else" (and the only field on old rows).
    hazmatUnNumber: text("hazmat_un_number"),
    hazmatShippingName: text("hazmat_shipping_name"),
    hazmatClass: text("hazmat_class"), // DOT class, e.g. "3", "5.1"
    hazmatPackingGroup: text("hazmat_packing_group"), // I | II | III | none
    hazmatQuantity: text("hazmat_quantity"),
    hazmatPlacardsRequired: text("hazmat_placards_required"), // yes | no | unknown
    hazmatEmergencyContact: text("hazmat_emergency_contact"), // e.g. CHEMTREC contract
    hazmatTechnicalName: text("hazmat_technical_name"),
    hazmatDetails: text("hazmat_details"),

    // Services / references / commercial context
    accessorials: jsonb("accessorials").$type<string[]>().notNull().default([]),
    referenceNumbers: jsonb("reference_numbers")
      .$type<{ label: string; value: string }[]>()
      .notNull()
      .default([]),
    targetRateUsd: numeric("target_rate_usd", { precision: 12, scale: 2 }),
    frequency: text("frequency").notNull().default("one_time"), // one_time | recurring | rfp
    notes: text("notes"),

    // Latest consolidated needs-info ask from the admin side (also in events).
    needsInfoMessage: text("needs_info_message"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("quote_requests_org_idx").on(t.organizationId, t.createdAt),
    index("quote_requests_status_idx").on(t.status, t.createdAt),
  ],
);

/** Shipper-facing quote on an RFQ: the all-in sell rate only. */
export const quotes = pgTable(
  "quotes",
  {
    id: text("id").primaryKey(),
    quoteRequestId: text("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    allInRateUsd: numeric("all_in_rate_usd", { precision: 12, scale: 2 }).notNull(),
    serviceDescription: text("service_description").notNull(),
    exclusions: text("exclusions"), // detention / lumper / TONU terms
    validUntil: timestamp("valid_until", { withTimezone: true }),
    status: text("status").notNull().default("sent"), // sent | accepted | declined | expired
    createdByUserId: text("created_by_user_id").notNull().references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quotes_org_idx").on(t.organizationId), index("quotes_rfq_idx").on(t.quoteRequestId)],
);

/** Append-only timeline; a trigger (migration 0003) rejects UPDATE/DELETE.
 * Renders the shipper status timeline and keeps the full history that the
 * simplified status fields elide. */
export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    quoteRequestId: text("quote_request_id").references(() => quoteRequests.id, {
      onDelete: "cascade",
    }),
    loadId: text("load_id").references(() => loads.id, { onDelete: "cascade" }),
    actorType: text("actor_type").notNull(), // shipper | admin | system
    actorId: text("actor_id"),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_org_idx").on(t.organizationId, t.createdAt),
    index("events_rfq_idx").on(t.quoteRequestId, t.createdAt),
    index("events_load_idx").on(t.loadId, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Loads (Phase 3). A load exists from booking onward; the RFQ keeps the
// pre-booking history. Freight fields are snapshotted from the RFQ at booking
// so later RFQ edits can never rewrite what was agreed. Statuses are the
// deliberate shipper-visible simplification of the future TMS states; the
// events table keeps the full history.

export const LOAD_STATUSES = [
  "booked",
  "dispatched",
  "in_transit",
  "delivered",
  "invoiced",
  "closed",
  "cancelled",
] as const;
export type LoadStatus = (typeof LOAD_STATUSES)[number];

/** Source of PEER-nnnn load references; booking takes nextval. */
export const loadReferenceSeq = pgSequence("load_reference_seq", {
  startWith: 1001,
  increment: 1,
});

export const loads = pgTable(
  "loads",
  {
    id: text("id").primaryKey(),
    /** Human reference, e.g. PEER-48293 (random, non-sequential). What shippers and carriers quote back. */
    reference: text("reference").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    quoteRequestId: text("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id),
    bookedByUserId: text("booked_by_user_id").notNull().references(() => user.id),
    status: text("status").$type<LoadStatus>().notNull().default("booked"),
    /** Agreed all-in sell rate (shipper-facing; never a buy rate or margin). */
    allInRateUsd: numeric("all_in_rate_usd", { precision: 12, scale: 2 }).notNull(),

    // Freight snapshot (copied from the RFQ at booking)
    originAddress: text("origin_address"),
    originCity: text("origin_city").notNull(),
    originState: text("origin_state").notNull(),
    originZip: text("origin_zip").notNull(),
    originHours: text("origin_hours"),
    originScheduling: text("origin_scheduling").notNull(),
    destAddress: text("dest_address"),
    destCity: text("dest_city").notNull(),
    destState: text("dest_state").notNull(),
    destZip: text("dest_zip").notNull(),
    destHours: text("dest_hours"),
    destScheduling: text("dest_scheduling").notNull(),
    pickupDate: date("pickup_date").notNull(),
    pickupWindow: text("pickup_window"),
    deliveryDate: date("delivery_date").notNull(),
    deliveryWindow: text("delivery_window"),
    commodity: text("commodity").notNull(),
    weightLbs: integer("weight_lbs").notNull(),
    pieces: text("pieces").notNull(),
    dims: text("dims"),
    declaredValueUsd: numeric("declared_value_usd", { precision: 12, scale: 2 }),
    equipment: text("equipment").notNull(),
    temperatureF: text("temperature_f"),
    equipmentNotes: text("equipment_notes"),
    hazmat: boolean("hazmat").notNull().default(false),
    hazmatDetails: text("hazmat_details"),
    accessorials: jsonb("accessorials").$type<string[]>().notNull().default([]),
    referenceNumbers: jsonb("reference_numbers")
      .$type<{ label: string; value: string }[]>()
      .notNull()
      .default([]),
    notes: text("notes"),

    // Current exception state (migration 0010). One live delay per load;
    // set/clear history lives in events (load_delayed / load_delay_cleared).
    // Reaching delivered or cancelled clears all three in the same tx.
    delayedAt: timestamp("delayed_at", { withTimezone: true }),
    delayReason: text("delay_reason"),
    revisedDeliveryDate: date("revised_delivery_date"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("loads_reference_idx").on(t.reference),
    index("loads_org_idx").on(t.organizationId, t.createdAt),
    index("loads_status_idx").on(t.status, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Documents (Phase 4). Metadata only — file bytes live in the documents
// bucket (GCS in production, a local directory in dev), never in Postgres.
// Downloads go through /api/documents/[id], which proves membership and
// visibility before handing out the file.

export const DOCUMENT_TYPES = [
  "rate_confirmation",
  "bol",
  "pod",
  "invoice",
  "other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    loadId: text("load_id")
      .notNull()
      .references(() => loads.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: text("type").$type<DocumentType>().notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    /** Object path inside the storage backend; opaque to the browser. */
    storagePath: text("storage_path").notNull(),
    /** Off until the founder shares it; internal paperwork stays internal. */
    visibleToShipper: boolean("visible_to_shipper").notNull().default(false),
    uploadedByUserId: text("uploaded_by_user_id").notNull().references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("documents_load_idx").on(t.loadId, t.createdAt),
    index("documents_org_idx").on(t.organizationId),
  ],
);

// ---------------------------------------------------------------------------
// Carrier assignment (Phase 5). One carrier per load in v1. Contact details
// and the pasted tracking link surface on the shipper's load page once
// `visibleToShipper` flips — auto-suggested at dispatch. Carrier cost never
// appears here (no pricing internals in the portal).

export const carrierAssignments = pgTable(
  "carrier_assignments",
  {
    id: text("id").primaryKey(),
    loadId: text("load_id")
      .notNull()
      .references(() => loads.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    carrierName: text("carrier_name").notNull(),
    mcNumber: text("mc_number"),
    driverName: text("driver_name"),
    driverPhone: text("driver_phone"),
    truckNumber: text("truck_number"),
    trailerNumber: text("trailer_number"),
    /** Pasted MacroPoint share link — the tracking surface (no API build). */
    trackingUrl: text("tracking_url"),
    visibleToShipper: boolean("visible_to_shipper").notNull().default(false),
    assignedByUserId: text("assigned_by_user_id").notNull().references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("carrier_assignments_load_idx").on(t.loadId),
    index("carrier_assignments_org_idx").on(t.organizationId),
  ],
);

// ---------------------------------------------------------------------------
// Invoices (migration 0011). The shipper-facing receivable as data, not just
// a PDF: number, amount, due date, open/paid. One invoice per load in v1.
// Amount is the sell side only (defaults to the load's all-in rate); pricing
// internals never enter the portal. An optional document link attaches the
// rendered PDF when there is one.

export const INVOICE_STATUSES = ["open", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Source of INV-nnnn invoice numbers; createInvoice takes nextval. */
export const invoiceNumberSeq = pgSequence("invoice_number_seq", {
  startWith: 1001,
  increment: 1,
});

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    loadId: text("load_id")
      .notNull()
      .references(() => loads.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** Human reference, e.g. INV-1001. What remittance advice quotes back. */
    number: text("number").notNull(),
    amountUsd: numeric("amount_usd", { precision: 12, scale: 2 }).notNull(),
    dueDate: date("due_date").notNull(),
    status: text("status").$type<InvoiceStatus>().notNull().default("open"),
    /** Optional link to the rendered invoice PDF in documents. */
    documentId: text("document_id").references(() => documents.id),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").notNull().references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("invoices_load_idx").on(t.loadId),
    uniqueIndex("invoices_number_idx").on(t.number),
    index("invoices_org_idx").on(t.organizationId, t.createdAt),
  ],
);
