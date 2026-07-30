import { z } from "zod";

/** Carrier-assignment form rules, shared by the admin form and action. */

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  trimmed(max).transform((v) => (v === "" ? null : v)).nullish();

export const carrierAssignmentSchema = z.object({
  carrierName: trimmed(160).min(1, "Required"),
  mcNumber: optionalText(20),
  driverName: optionalText(120),
  driverPhone: optionalText(40),
  truckNumber: optionalText(40),
  trailerNumber: optionalText(40),
  trackingUrl: z
    .string()
    .trim()
    .url("Full link, starting with https://")
    .max(500)
    .refine((v) => /^https?:\/\//.test(v), "Full link, starting with https://")
    .nullish()
    .or(z.literal("").transform(() => null)),
  visibleToShipper: z.boolean().default(false),
});
export type CarrierAssignmentInput = z.infer<typeof carrierAssignmentSchema>;
