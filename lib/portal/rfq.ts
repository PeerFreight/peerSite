import { z } from "zod";
import type { QuoteRequestStatus } from "@/db/schema";

/**
 * Shared RFQ validation and display vocabulary. The client form and the
 * server action both validate with `rfqSchema`, so the rules can never
 * drift apart. Field set mirrors the tender-intake checklist in the
 * first-load runbook.
 */

export const EQUIPMENT_OPTIONS = [
  { value: "dry_van_53", label: "Dry van 53'" },
  { value: "reefer", label: "Reefer" },
  { value: "flatbed", label: "Flatbed" },
  { value: "other", label: "Other" },
] as const;
export type Equipment = (typeof EQUIPMENT_OPTIONS)[number]["value"];

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
    equipment: z.enum(["dry_van_53", "reefer", "flatbed", "other"]),
    temperatureF: optionalText(40),
    equipmentNotes: optionalText(300),
    hazmat: z.boolean().default(false),
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
    if (v.hazmat && !v.hazmatDetails) {
      ctx.issues.push({
        code: "custom",
        message: "Tell us the UN number / class / description so we can review",
        path: ["hazmatDetails"],
        input: v.hazmatDetails,
      });
    }
  });

export type RfqInput = z.infer<typeof rfqSchema>;

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

export function laneSummary(r: {
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
}) {
  return `${r.originCity}, ${r.originState} → ${r.destCity}, ${r.destState}`;
}
