import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { findPendingInvitationForEmail, listUserOrganizations } from "@/lib/portal/queries";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Set up your company - Peer Freight",
  robots: { index: false },
};

export default async function OnboardingPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const db = await getDb();
  const orgs = await listUserOrganizations(db, session.user.id);
  if (orgs.length > 0) redirect("/dashboard");

  // Invited teammates who signed up without their link should join the
  // inviting company, not create a duplicate one.
  const invitation = await findPendingInvitationForEmail(db, session.user.email);
  if (invitation) redirect(`/invite/${invitation.id}`);

  return <OnboardingForm />;
}
