import type { Metadata } from "next";
import { AppShell } from "@/components/portal/app-shell";
import { PortalNav } from "@/components/portal/portal-nav";
import { StatusBadge } from "@/components/portal/status";
import { LinkButton } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listQuoteRequests } from "@/lib/portal/queries";
import { equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { isAdmin } from "@/lib/portal/roles";
import { requireOrgSession } from "@/lib/portal/session";
import { SignOutButton } from "../sign-out-button";

export const metadata: Metadata = {
  title: "Dashboard - Peer Freight",
  robots: { index: false },
};

export default async function DashboardPage() {
  const { session, db, org } = await requireOrgSession();
  const requests = await listQuoteRequests(db, session.user.id, org.id);
  const open = requests.filter((r) => ["submitted", "needs_info", "quoted"].includes(r.status));

  return (
    <AppShell
      nav={<PortalNav active="dashboard" admin={isAdmin(session.user)} />}
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
              Tell us the lane, dates, and freight. One of the owners prices it
              and gets back to you within the hour during business hours.
            </CardDescription>
            <div className="mt-4">
              <LinkButton href="/quotes/new">New quote request</LinkButton>
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

        {open.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-extrabold">Open quote requests</h2>
              <a href="/quotes" className="text-sm font-bold text-muted hover:text-ink">
                View all →
              </a>
            </div>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {open.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <a
                    href={`/quotes/${r.id}`}
                    className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-paper"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">{laneSummary(r)}</p>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {equipmentLabel(r.equipment)} · {r.commodity}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
