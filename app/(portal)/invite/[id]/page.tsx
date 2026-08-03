import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthShell } from "@/components/portal/auth-shell";
import { Button, LinkButton } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getInvitationForAcceptPage } from "@/lib/portal/queries";
import { acceptInvitationAction } from "./actions";
import { SwitchAccountButton } from "./switch-account";

// Invitation state and session membership are request-time data.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Team invitation - Peer Freight",
  robots: { index: false },
};

/**
 * Invitation accept page. Deliberately reachable signed-out (not in the
 * middleware matcher): the emailed link is the entry point for people with
 * no account yet. Possession of the unguessable invitation id plus signing
 * in as the invited email is what authorizes the join.
 */
export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const db = await getDb();
  const invitation = await getInvitationForAcceptPage(db, id);
  const live =
    invitation && invitation.status === "pending" && invitation.expiresAt > new Date();

  if (!live) {
    return (
      <AuthShell>
        <CardTitle className="text-2xl">Invitation not available</CardTitle>
        <CardDescription>
          This invitation link is invalid, was cancelled, or has expired. Ask
          your teammate to send a fresh one.
        </CardDescription>
        <div className="mt-6">
          <LinkButton href="/login" variant="secondary">Go to sign in</LinkButton>
        </div>
      </AuthShell>
    );
  }

  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const invitedEmail = invitation.email.toLowerCase();

  // Signed out: create the account (signup admits the invited email while
  // the invitation is pending) or sign in, then come back here.
  if (!session) {
    const signupHref = `/signup?invite=${invitation.id}&email=${encodeURIComponent(invitation.email)}`;
    const loginHref = `/login?next=${encodeURIComponent(`/invite/${invitation.id}`)}`;
    return (
      <AuthShell>
        <CardTitle className="text-2xl">Join {invitation.organizationName}</CardTitle>
        <CardDescription>
          {invitation.inviterName} invited {invitation.email} to the{" "}
          {invitation.organizationName} team on the Peer Freight shipper portal.
        </CardDescription>
        <div className="mt-6 flex flex-col gap-3">
          <LinkButton href={signupHref}>Create account</LinkButton>
          <LinkButton href={loginHref} variant="secondary">
            I already have an account
          </LinkButton>
        </div>
      </AuthShell>
    );
  }

  // Signed in as someone else: the invitation is bound to the invited email.
  if (session.user.email.toLowerCase() !== invitedEmail) {
    return (
      <AuthShell>
        <CardTitle className="text-2xl">This invitation is for someone else</CardTitle>
        <CardDescription>
          The invitation was sent to {invitation.email}, but you are signed in
          as {session.user.email}. Switch to the invited account to join{" "}
          {invitation.organizationName}.
        </CardDescription>
        <div className="mt-6">
          <SwitchAccountButton />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <CardTitle className="text-2xl">Join {invitation.organizationName}</CardTitle>
      <CardDescription>
        {invitation.inviterName} invited you to the {invitation.organizationName}{" "}
        team. Joining shares the company&apos;s quotes, loads, and documents with
        this account.
      </CardDescription>
      {error ? (
        <p className="mt-4 text-sm text-red-700">
          Could not accept the invitation. Try again — if it keeps failing, ask
          for a fresh invite.
        </p>
      ) : null}
      <form action={acceptInvitationAction} className="mt-6">
        <input type="hidden" name="invitationId" value={invitation.id} />
        <Button type="submit">Join {invitation.organizationName}</Button>
      </form>
    </AuthShell>
  );
}
