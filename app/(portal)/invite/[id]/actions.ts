"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

/**
 * Join the inviting org: accept, make it the session's active org (so
 * requireOrgSession lands the new member in the right company, not their
 * first membership row), then go to the dashboard.
 */
export async function acceptInvitationAction(formData: FormData) {
  const invitationId = String(formData.get("invitationId") ?? "");
  if (!invitationId) redirect("/dashboard");
  const auth = await getAuth();
  const h = await headers();
  let organizationId: string | null = null;
  try {
    const accepted = await auth.api.acceptInvitation({
      headers: h,
      body: { invitationId },
    });
    organizationId = accepted?.invitation.organizationId ?? null;
  } catch {
    redirect(`/invite/${invitationId}?error=accept_failed`);
  }
  if (organizationId) {
    try {
      await auth.api.setActiveOrganization({ headers: h, body: { organizationId } });
    } catch {
      // Non-fatal: membership exists; the session guard falls back to it.
    }
  }
  redirect("/dashboard");
}
