"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { composeRfqTeamAlert, deliver } from "@/lib/portal/notify";
import { createQuoteRequest, declineQuote } from "@/lib/portal/queries";
import { rfqFromFormData, rfqSchema, type RfqFormState } from "@/lib/portal/rfq";
import { requireOrgSession } from "@/lib/portal/session";

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
  try {
    await deliver(
      composeRfqTeamAlert({
        orgName: org.name,
        requesterName: session.user.name,
        requesterEmail: session.user.email,
        requestId: id,
        rfq: parsed.data,
      }),
    );
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
