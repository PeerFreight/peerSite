"use server";

import { z } from "zod";
import { getDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { clientIpKey, consumeThrottle } from "@/lib/portal/throttle";

/**
 * In-house replacement for the FormSubmit relay the carrier setup form used
 * to post to: carrier PII (MC/DOT numbers, phone, factoring details) should
 * reach team@peer-freight.com through our own Resend account, not a
 * third-party form service with its captcha turned off. Same protections as
 * the guest quote funnel: honeypot + per-IP throttle + zod.
 */

export type CarrierSetupFormState = { sent: true } | { sent?: never; formError: string } | null;

const carrierSetupSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(200),
  name: z.string().trim().min(1, "Your name is required").max(120),
  mcNumber: z.string().trim().min(1, "MC number is required").max(40),
  usdotNumber: z.string().trim().min(1, "USDOT number is required").max(40),
  email: z.email("Enter a valid email").max(200),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(40),
  homeBase: z.string().trim().min(1, "Home base is required").max(120),
  truckCount: z.string().trim().min(1, "Number of trucks is required").max(40),
  equipment: z.array(z.string().max(40)).max(10),
  hazmat: z.string().trim().max(10),
  payment: z.string().trim().max(40),
  lanes: z.string().trim().max(200),
  factoringCompany: z.string().trim().max(120),
  notes: z.string().trim().max(2000),
});

function fromFormData(formData: FormData) {
  const text = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : "";
  };
  return {
    company: text("company"),
    name: text("name"),
    mcNumber: text("mc_number"),
    usdotNumber: text("usdot_number"),
    email: text("email"),
    phone: text("phone"),
    homeBase: text("home_base"),
    truckCount: text("truck_count"),
    equipment: formData.getAll("equipment").filter((v): v is string => typeof v === "string"),
    hazmat: text("hazmat"),
    payment: text("payment"),
    lanes: text("lanes"),
    factoringCompany: text("factoring_company"),
    notes: text("notes"),
  };
}

export async function submitCarrierSetup(
  _prev: CarrierSetupFormState,
  formData: FormData,
): Promise<CarrierSetupFormState> {
  // Honeypot: humans never see the field; pretend success so bots stop probing.
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot !== "") return { sent: true };

  const db = await getDb();
  if (!(await consumeThrottle(db, await clientIpKey("carrier-setup"), { windowSeconds: 3600, max: 3 }))) {
    return {
      formError:
        "Too many setup requests from your network in the last hour. Wait a bit and try again, or email team@peer-freight.com.",
    };
  }

  const parsed = carrierSetupSchema.safeParse(fromFormData(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { formError: first?.message ?? "Fix the highlighted fields and resubmit." };
  }
  const d = parsed.data;

  await sendEmail({
    to: "team@peer-freight.com",
    subject: "New carrier setup — peer-freight.com",
    text: [
      "New carrier setup request from the website:",
      "",
      `Company: ${d.company}`,
      `Contact: ${d.name}`,
      `MC number: ${d.mcNumber}`,
      `USDOT number: ${d.usdotNumber}`,
      `Email: ${d.email}`,
      `Phone: ${d.phone}`,
      `Home base: ${d.homeBase}`,
      `Trucks: ${d.truckCount}`,
      `Equipment: ${d.equipment.length ? d.equipment.join(", ") : "(none checked)"}`,
      `Hazmat drivers: ${d.hazmat || "No"}`,
      `Payment: ${d.payment || "Direct deposit"}`,
      `Preferred lanes: ${d.lanes || "-"}`,
      `Factoring company: ${d.factoringCompany || "-"}`,
      `Notes: ${d.notes || "-"}`,
    ].join("\n"),
  });

  return { sent: true };
}
