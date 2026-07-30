import type { Metadata } from "next";
import { AppShell } from "@/components/portal/app-shell";
import { PortalNav } from "@/components/portal/portal-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listUserOrganizations } from "@/lib/portal/queries";
import { isAdmin } from "@/lib/portal/roles";
import { requireOrgSession } from "@/lib/portal/session";
import { SignOutButton } from "../sign-out-button";

export const metadata: Metadata = {
  title: "Settings - Peer Freight",
  robots: { index: false },
};

export default async function SettingsPage() {
  const { session, db } = await requireOrgSession();
  const orgs = await listUserOrganizations(db, session.user.id);

  return (
    <AppShell
      nav={<PortalNav active="settings" admin={isAdmin(session.user)} />}
      user={<SignOutButton label={session.user.name} />}
    >
      <div className="max-w-xl space-y-6">
        <h1 className="text-2xl font-extrabold">Settings</h1>
        <Card>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            {session.user.name} · {session.user.email}
            {isAdmin(session.user) ? (
              <Badge tone="navy" className="ml-2">Admin</Badge>
            ) : null}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Company</CardTitle>
          <CardDescription>
            {orgs.map((o) => (
              <span key={o.id} className="block">
                {o.name} <span className="text-muted">({o.role})</span>
              </span>
            ))}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Teammates</CardTitle>
          <CardDescription>
            Invites are coming with the quote-request flow. For now, email
            team@peer-freight.com and we will add your teammates.
          </CardDescription>
        </Card>
      </div>
    </AppShell>
  );
}
