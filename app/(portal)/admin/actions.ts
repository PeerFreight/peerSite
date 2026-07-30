"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { requestInfo, sendQuote } from "@/lib/portal/admin-queries";
import { needsInfoSchema, sendQuoteSchema } from "@/lib/portal/rfq";
import { requireAdminSession } from "@/lib/portal/session";
import { baseUrl } from "@/lib/portal/urls";

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
