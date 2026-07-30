import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/portal/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listUserOrganizations } from "@/lib/portal/queries";
import { SignOutButton } from "../sign-out-button";

export const metadata: Metadata = {
  title: "Dashboard - Peer Freight",
  robots: { index: false },
};

export default async function DashboardPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const db = await getDb();
  const orgs = await listUserOrganizations(db, session.user.id);
  if (orgs.length === 0) redirect("/onboarding");
  const org = orgs[0];

  return (
    <AppShell
      nav={
        <>
          <a href="/dashboard" className="text-white">Dashboard</a>
          <a href="/settings" className="hover:text-white">Settings</a>
        </>
      }
      user={<SignOutButton label={session.user.name} />}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold">{org.name}</h1>
          <p className="mt-1 text-muted">Welcome, {session.user.name.split(" ")[0]}.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardTitle>Request a quote</CardTitle>
            <CardDescription>
              Structured quote requests land here once the RFQ flow ships. Until
              then, use the quote form or email team@peer-freight.com — one of
              the owners gets back to you within the hour.
            </CardDescription>
            <div className="mt-4">
              <Button disabled title="Coming soon">New quote request</Button>
            </div>
          </Card>
          <Card>
            <CardTitle>Active loads</CardTitle>
            <CardDescription>
              No loads yet. Once we book your first load, its status, timeline,
              carrier, and documents show up here.
            </CardDescription>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
