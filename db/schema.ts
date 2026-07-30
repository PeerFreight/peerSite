import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
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
});

// Pre-authority posture: signup is invite-only. A founder seeds a row here
// before a shipper can create an account. @peer-freight.com is always allowed.

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
    actorType: text("actor_type").notNull(), // shipper | admin | system
    actorId: text("actor_id"),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_org_idx").on(t.organizationId, t.createdAt),
    index("events_rfq_idx").on(t.quoteRequestId, t.createdAt),
  ],
);
