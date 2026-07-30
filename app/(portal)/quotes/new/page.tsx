import type { Metadata } from "next";
import { AppShell } from "@/components/portal/app-shell";
import { PortalNav } from "@/components/portal/portal-nav";
import { isAdmin } from "@/lib/portal/roles";
import { requireOrgSession } from "@/lib/portal/session";
import { SignOutButton } from "../../sign-out-button";
import { RfqForm } from "./rfq-form";

export const metadata: Metadata = {
  title: "New quote request - Peer Freight",
  robots: { index: false },
};

export default async function NewQuotePage() {
  const { session } = await requireOrgSession();

  return (
    <AppShell
      nav={<PortalNav active="quotes" admin={isAdmin(session.user)} />}
      user={<SignOutButton label={session.user.name} />}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold">Request a quote</h1>
          <p className="mt-1 text-muted">
            The more complete this is, the faster we can price it. Missing
            details are the number one thing that slows a quote down.
          </p>
        </div>
        <RfqForm />
      </div>
    </AppShell>
  );
}
