import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/portal/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getAuth, isAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listUserOrganizations } from "@/lib/portal/queries";
import { SignOutButton } from "../sign-out-button";

export const metadata: Metadata = {
  title: "Settings - Peer Freight",
  robots: { index: false },
};

export default async function SettingsPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const db = await getDb();
  const orgs = await listUserOrganizations(db, session.user.id);
  if (orgs.length === 0) redirect("/onboarding");

  return (
    <AppShell
      nav={
        <>
          <a href="/dashboard" className="hover:text-white">Dashboard</a>
          <a href="/settings" className="text-white">Settings</a>
        </>
      }
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
