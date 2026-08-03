"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { createQuoteRequest, declineQuote } from "@/lib/portal/queries";
import { hazmatSummary, laneSummary, rfqFromFormData, rfqSchema, type RfqFormState } from "@/lib/portal/rfq";
import { requireOrgSession } from "@/lib/portal/session";
import { baseUrl } from "@/lib/portal/urls";

export async function submitRfq(_prev: RfqFormState, formData: FormData): Promise<RfqFormState> {
  const { session, db, org } = await requireOrgSession();

  const parsed = rfqSchema.safeParse(rfqFromFormData(formData));
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      formError: "Fix the highlighted fields and resubmit.",
    };
  }

  const id = await createQuoteRequest(db, session.user.id, org.id, parsed.data);

  // Notify the desk. "Quote within the hour" starts from this email; a send
  // failure must not lose the submission, so log and move on.
  const lane = laneSummary(parsed.data);
  try {
    await sendEmail({
      to: "team@peer-freight.com",
      subject: `New quote request: ${lane}`,
      text: [
        `${org.name} (${session.user.name}, ${session.user.email}) submitted a quote request.`,
        "",
        `- Lane: ${lane}`,
        `- Pickup: ${parsed.data.pickupDate}`,
        `- Equipment: ${parsed.data.equipment}`,
        `- Commodity: ${parsed.data.commodity}`,
        `- Weight: ${parsed.data.weightLbs} lbs`,
        parsed.data.hazmat
          ? `- HAZMAT (${hazmatSummary(parsed.data)}): review before quoting`
          : null,
        "",
        `Quote it: ${baseUrl()}/admin/quotes/${id}`,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    });
  } catch (err) {
    console.error("rfq notification email failed", err);
  }

  redirect(`/quotes/${id}`);
}

export async function declineQuoteAction(quoteId: string, requestId: string) {
  const { session, db, org } = await requireOrgSession();
  await declineQuote(db, session.user.id, org.id, quoteId);
  revalidatePath(`/quotes/${requestId}`);
  revalidatePath("/quotes");
}
