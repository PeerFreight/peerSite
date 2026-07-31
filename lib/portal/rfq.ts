import { z } from "zod";
import type { QuoteRequestStatus } from "@/db/schema";

/**
 * Shared RFQ validation and display vocabulary. The client form and the
 * server action both validate with `rfqSchema`, so the rules can never
 * drift apart. Field set mirrors the tender-intake checklist in the
 * first-load runbook.
 */

/** Equipment vocabulary, grouped for the form's optgroups. Values are plain
 * text in the DB, so extending this list never needs a migration and old
 * rows keep rendering (unknown values fall back to the raw string). */
export const EQUIPMENT_GROUPS = [
  {
    label: "Van",
    options: [
      { value: "dry_van_53", label: "Dry van 53'" },
      { value: "dry_van_48", label: "Dry van 48'" },
      { value: "box_truck", label: "Box truck" },
      { value: "sprinter_van", label: "Sprinter / cargo van" },
    ],
  },
  {
    label: "Temp controlled",
    options: [{ value: "reefer", label: "Reefer 53'" }],
  },
  {
    label: "Open deck",
    options: [
      { value: "flatbed", label: "Flatbed" },
      { value: "step_deck", label: "Step deck" },
      { value: "conestoga", label: "Conestoga" },
      { value: "double_drop", label: "Double drop" },
      { value: "rgn_lowboy", label: "RGN / lowboy" },
      { value: "hotshot", label: "Hotshot" },
    ],
  },
  {
    label: "Bulk & tank",
    options: [
      { value: "chemical_tanker", label: "Chemical tanker" },
      { value: "iso_tank", label: "ISO tank" },
      { value: "pneumatic", label: "Pneumatic" },
      { value: "end_dump", label: "End dump" },
    ],
  },
  {
    label: "Other",
    options: [
      { value: "power_only", label: "Power only" },
      { value: "ltl_partial", label: "LTL / partial" },
      { value: "other", label: "Other / not sure" },
    ],
  },
] as const;

type EquipmentOption = (typeof EQUIPMENT_GROUPS)[number]["options"][number];
export const EQUIPMENT_OPTIONS: readonly EquipmentOption[] = EQUIPMENT_GROUPS.flatMap(
  (g) => g.options as readonly EquipmentOption[],
);
export type Equipment = EquipmentOption["value"];

const EQUIPMENT_VALUES = EQUIPMENT_OPTIONS.map((o) => o.value) as [Equipment, ...Equipment[]];

/** Equipment values whose pick needs a free-text clarifier. */
export const EQUIPMENT_NEEDS_NOTES: readonly string[] = ["other", "ltl_partial"];

export const ACCESSORIAL_OPTIONS = [
  { value: "liftgate_pickup", label: "Liftgate at pickup" },
  { value: "liftgate_delivery", label: "Liftgate at delivery" },
  { value: "driver_assist", label: "Driver assist / count" },
  { value: "pallet_jack", label: "Pallet jack" },
  { value: "lumper", label: "Lumper" },
  { value: "pallet_exchange", label: "Pallet exchange" },
  { value: "straps", label: "Straps" },
  { value: "tarps", label: "Tarps" },
  { value: "seal", label: "Seal required" },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: "one_time", label: "One-time shipment" },
  { value: "recurring", label: "Recurring lane" },
  { value: "rfp", label: "RFP / contract pricing" },
] as const;

export const SCHEDULING_OPTIONS = [
  { value: "fcfs", label: "First come, first served" },
  { value: "appointment", label: "Appointment required" },
] as const;

/** DOT hazard classes (49 CFR 173.2), collapsed to the 15 entries shippers
 * actually pick from (class 1 divisions folded into one). */
export const HAZMAT_CLASS_OPTIONS = [
  { value: "1", label: "Class 1 — Explosives" },
  { value: "2.1", label: "2.1 — Flammable gas" },
  { value: "2.2", label: "2.2 — Non-flammable gas" },
  { value: "2.3", label: "2.3 — Poison gas" },
  { value: "3", label: "Class 3 — Flammable liquid" },
  { value: "4.1", label: "4.1 — Flammable solid" },
  { value: "4.2", label: "4.2 — Spontaneously combustible" },
  { value: "4.3", label: "4.3 — Dangerous when wet" },
  { value: "5.1", label: "5.1 — Oxidizer" },
  { value: "5.2", label: "5.2 — Organic peroxide" },
  { value: "6.1", label: "6.1 — Poison (toxic)" },
  { value: "6.2", label: "6.2 — Infectious substance" },
  { value: "7", label: "Class 7 — Radioactive" },
  { value: "8", label: "Class 8 — Corrosive" },
  { value: "9", label: "Class 9 — Miscellaneous" },
] as const;
export type HazmatClass = (typeof HAZMAT_CLASS_OPTIONS)[number]["value"];

const HAZMAT_CLASS_VALUES = HAZMAT_CLASS_OPTIONS.map((o) => o.value) as [
  HazmatClass,
  ...HazmatClass[],
];

export const HAZMAT_PACKING_GROUP_OPTIONS = [
  { value: "I", label: "PG I — high danger" },
  { value: "II", label: "PG II — medium danger" },
  { value: "III", label: "PG III — low danger" },
  { value: "none", label: "Not applicable" },
] as const;

export const HAZMAT_PLACARD_OPTIONS = [
  { value: "unknown", label: "Not sure" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

export const STATUS_LABELS: Record<QuoteRequestStatus, string> = {
  submitted: "Submitted",
  needs_info: "Needs info",
  quoted: "Quoted",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  withdrawn: "Withdrawn",
};

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  trimmed(max).transform((v) => (v === "" ? null : v)).nullish();
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .enum(values)
    .nullish()
    .or(z.literal("").transform(() => null));
const state = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, "2-letter state")
  .transform((v) => v.toUpperCase());
const zip = z.string().trim().regex(/^\d{5}(-\d{4})?$/, "ZIP like 94107");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const money = z
  .string()
  .trim()
  .regex(/^\$?\d{1,9}(\.\d{1,2})?$/, "Dollar amount like 1850 or 1850.00")
  .transform((v) => v.replace(/^\$/, ""));
const optionalMoney = money
  .nullish()
  .or(z.literal("").transform(() => null));
/** "1993", "UN1993", "un 1993" → "UN1993"; blank → null. */
const unNumber = z
  .string()
  .trim()
  .regex(/^(UN\s?)?\d{4}$/i, "UN number like UN1993")
  .transform((v) => `UN${v.replace(/\D/g, "")}`)
  .nullish()
  .or(z.literal("").transform(() => null));

export const rfqSchema = z
  .object({
    // Lane
    originAddress: optionalText(200),
    originCity: trimmed(80).min(1, "Required"),
    originState: state,
    originZip: zip,
    originHours: optionalText(120),
    originScheduling: z.enum(["fcfs", "appointment"]),
    destAddress: optionalText(200),
    destCity: trimmed(80).min(1, "Required"),
    destState: state,
    destZip: zip,
    destHours: optionalText(120),
    destScheduling: z.enum(["fcfs", "appointment"]),

    // Schedule
    pickupDate: isoDate,
    pickupWindow: optionalText(120),
    deliveryDate: isoDate,
    deliveryWindow: optionalText(120),
    dateFlexibility: z.enum(["exact", "flexible"]),

    // Freight
    commodity: trimmed(200).min(1, "Required — be exact (e.g. packaged beer, cases on pallets)"),
    weightLbs: z.coerce
      .number()
      .int("Whole pounds")
      .positive("Required")
      .max(100000, "Check the weight — that exceeds any legal single-truck load"),
    pieces: trimmed(120).min(1, "Required — e.g. 26 pallets"),
    dims: optionalText(120),
    declaredValueUsd: optionalMoney,
    equipment: z.enum(EQUIPMENT_VALUES),
    temperatureF: optionalText(40),
    equipmentNotes: optionalText(300),
    hazmat: z.boolean().default(false),
    hazmatUnNumber: unNumber,
    hazmatShippingName: optionalText(200),
    hazmatClass: optionalEnum(HAZMAT_CLASS_VALUES),
    hazmatPackingGroup: optionalEnum(["I", "II", "III", "none"] as const),
    hazmatQuantity: optionalText(120),
    hazmatPlacardsRequired: optionalEnum(["unknown", "yes", "no"] as const),
    hazmatEmergencyContact: optionalText(120),
    hazmatTechnicalName: optionalText(200),
    hazmatDetails: optionalText(500),

    // Services / references / rate
    accessorials: z.array(z.string().max(40)).max(20).default([]),
    referenceNumbers: z
      .array(z.object({ label: trimmed(40).min(1), value: trimmed(80).min(1) }))
      .max(10)
      .default([]),
    targetRateUsd: optionalMoney,
    frequency: z.enum(["one_time", "recurring", "rfp"]),
    notes: optionalText(2000),
  })
  .check((ctx) => {
    const v = ctx.value;
    if (v.deliveryDate < v.pickupDate) {
      ctx.issues.push({
        code: "custom",
        message: "Delivery can't be before pickup",
        path: ["deliveryDate"],
        input: v.deliveryDate,
      });
    }
    if (v.equipment === "reefer" && !v.temperatureF) {
      ctx.issues.push({
        code: "custom",
        message: "Reefer needs a temperature set point",
        path: ["temperatureF"],
        input: v.temperatureF,
      });
    }
    // Hazmat pricing needs UN number + shipping name + class; the rest are
    // shipping-paper details that must not block the quote.
    if (v.hazmat) {
      if (!v.hazmatUnNumber) {
        ctx.issues.push({
          code: "custom",
          message: "Required for hazmat, e.g. UN1993",
          path: ["hazmatUnNumber"],
          input: v.hazmatUnNumber,
        });
      }
      if (!v.hazmatShippingName) {
        ctx.issues.push({
          code: "custom",
          message: "Required — the proper shipping name on the SDS",
          path: ["hazmatShippingName"],
          input: v.hazmatShippingName,
        });
      }
      if (!v.hazmatClass) {
        ctx.issues.push({
          code: "custom",
          message: "Pick the DOT hazard class",
          path: ["hazmatClass"],
          input: v.hazmatClass,
        });
      }
    }
  });

export type RfqInput = z.infer<typeof rfqSchema>;

/** Wizard steps → schema fields, used to filter validation errors to the
 * step being advanced. Fields absent here (e.g. hazmat boolean itself) never
 * error. Kept beside the schema so a new field must pick its step. */
export const STEP_FIELDS: Record<number, readonly (keyof RfqInput)[]> = {
  1: [
    "originAddress",
    "originCity",
    "originState",
    "originZip",
    "originHours",
    "originScheduling",
    "destAddress",
    "destCity",
    "destState",
    "destZip",
    "destHours",
    "destScheduling",
    "pickupDate",
    "pickupWindow",
    "deliveryDate",
    "deliveryWindow",
    "dateFlexibility",
  ],
  2: [
    "commodity",
    "weightLbs",
    "pieces",
    "dims",
    "declaredValueUsd",
    "equipment",
    "temperatureF",
    "equipmentNotes",
    "hazmat",
    "hazmatUnNumber",
    "hazmatShippingName",
    "hazmatClass",
    "hazmatPackingGroup",
    "hazmatQuantity",
    "hazmatPlacardsRequired",
    "hazmatEmergencyContact",
    "hazmatTechnicalName",
    "hazmatDetails",
  ],
  3: ["accessorials", "referenceNumbers", "targetRateUsd", "frequency", "notes"],
};

/** Admin send-quote form; shipper-facing fields only (no pricing internals). */
export const sendQuoteSchema = z.object({
  allInRateUsd: money,
  serviceDescription: trimmed(1000).min(1, "Required"),
  exclusions: optionalText(1000),
  validUntil: isoDate.nullish().or(z.literal("").transform(() => null)),
});
export type SendQuoteInput = z.infer<typeof sendQuoteSchema>;

export const needsInfoSchema = z.object({
  message: trimmed(2000).min(1, "Ask for everything missing in one consolidated message"),
});

/** Rebuild the RFQ object a form posts. Kept beside the schema so the field
 * names stay in one file. */
export function rfqFromFormData(fd: FormData): unknown {
  const text = (name: string) => {
    const v = fd.get(name);
    return typeof v === "string" ? v : "";
  };
  const referenceNumbers: { label: string; value: string }[] = [];
  for (let i = 0; i < 10; i++) {
    const label = text(`refLabel${i}`).trim();
    const value = text(`refValue${i}`).trim();
    if (label || value) referenceNumbers.push({ label: label || "Ref", value });
  }
  return {
    originAddress: text("originAddress"),
    originCity: text("originCity"),
    originState: text("originState"),
    originZip: text("originZip"),
    originHours: text("originHours"),
    originScheduling: text("originScheduling"),
    destAddress: text("destAddress"),
    destCity: text("destCity"),
    destState: text("destState"),
    destZip: text("destZip"),
    destHours: text("destHours"),
    destScheduling: text("destScheduling"),
    pickupDate: text("pickupDate"),
    pickupWindow: text("pickupWindow"),
    deliveryDate: text("deliveryDate"),
    deliveryWindow: text("deliveryWindow"),
    dateFlexibility: text("dateFlexibility"),
    commodity: text("commodity"),
    weightLbs: text("weightLbs"),
    pieces: text("pieces"),
    dims: text("dims"),
    declaredValueUsd: text("declaredValueUsd"),
    equipment: text("equipment"),
    temperatureF: text("temperatureF"),
    equipmentNotes: text("equipmentNotes"),
    hazmat: fd.get("hazmat") === "on",
    hazmatUnNumber: text("hazmatUnNumber"),
    hazmatShippingName: text("hazmatShippingName"),
    hazmatClass: text("hazmatClass"),
    hazmatPackingGroup: text("hazmatPackingGroup"),
    hazmatQuantity: text("hazmatQuantity"),
    hazmatPlacardsRequired: text("hazmatPlacardsRequired"),
    hazmatEmergencyContact: text("hazmatEmergencyContact"),
    hazmatTechnicalName: text("hazmatTechnicalName"),
    hazmatDetails: text("hazmatDetails"),
    accessorials: fd.getAll("accessorials").filter((v): v is string => typeof v === "string"),
    referenceNumbers,
    targetRateUsd: text("targetRateUsd"),
    frequency: text("frequency"),
    notes: text("notes"),
  };
}

export function equipmentLabel(value: string) {
  return EQUIPMENT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function accessorialLabel(value: string) {
  return ACCESSORIAL_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function hazmatClassLabel(value: string) {
  return HAZMAT_CLASS_OPTIONS.find((o) => o.value === value)?.label ?? `Class ${value}`;
}

/** Fields hazmatSummary reads — both quote_requests rows and parsed RFQs. */
export type HazmatFields = {
  hazmat: boolean;
  hazmatUnNumber?: string | null;
  hazmatShippingName?: string | null;
  hazmatClass?: string | null;
  hazmatPackingGroup?: string | null;
  hazmatQuantity?: string | null;
  hazmatDetails?: string | null;
};

/** One-line hazmat digest ("UN1993 · Diesel fuel · Class 3 · PG III") for
 * the admin queue, team email, and the load's freight snapshot. Old rows
 * with only free-text details fall back to that text. */
export function hazmatSummary(r: HazmatFields): string | null {
  if (!r.hazmat) return null;
  const parts = [
    r.hazmatUnNumber,
    r.hazmatShippingName,
    r.hazmatClass ? `Class ${r.hazmatClass}` : null,
    r.hazmatPackingGroup && r.hazmatPackingGroup !== "none" ? `PG ${r.hazmatPackingGroup}` : null,
    r.hazmatQuantity,
  ].filter(Boolean);
  if (parts.length === 0) return r.hazmatDetails ?? "Yes — details pending";
  return parts.join(" · ");
}

export function laneSummary(r: {
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
}) {
  return `${r.originCity}, ${r.originState} → ${r.destCity}, ${r.destState}`;
}
