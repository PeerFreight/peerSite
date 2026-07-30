import type { Metadata } from "next";
import { AppShell } from "@/components/portal/app-shell";
import { EventTimeline } from "@/components/portal/event-timeline";
import { PortalNav } from "@/components/portal/portal-nav";
import { LoadStatusBadge, StatusBadge } from "@/components/portal/status";
import { LinkButton } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getDashboardSummary } from "@/lib/portal/queries";
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
  const { activeLoads, openRequests, recentEvents } = await getDashboardSummary(
    db,
    session.user.id,
    org.id,
  );

  return (
    <AppShell
      nav={<PortalNav active="dashboard" admin={isAdmin(session.user)} />}
      user={<SignOutButton label={session.user.name} />}
    >
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">{org.name}</h1>
            <p className="mt-1 text-muted">Welcome, {session.user.name.split(" ")[0]}.</p>
          </div>
          <LinkButton href="/quotes/new">New quote request</LinkButton>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-extrabold">Active loads</h2>
            {activeLoads.length > 0 ? (
              <a href="/loads" className="text-sm font-bold text-muted hover:text-ink">
                View all →
              </a>
            ) : null}
          </div>
          {activeLoads.length === 0 ? (
            <Card>
              <CardTitle>No active loads</CardTitle>
              <CardDescription>
                Once we book a load for you, its status, timeline, carrier, and
                documents show up here.
              </CardDescription>
            </Card>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {activeLoads.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <a
                    href={`/loads/${l.id}`}
                    className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-paper"
                  >
                    <span className="w-24 text-sm font-extrabold tabular-nums text-navy">
                      {l.reference}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">{laneSummary(l)}</p>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {equipmentLabel(l.equipment)} · {l.commodity}
                      </p>
                    </div>
                    <LoadStatusBadge status={l.status} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-extrabold">Open quote requests</h2>
              <a href="/quotes" className="text-sm font-bold text-muted hover:text-ink">
                View all →
              </a>
            </div>
            {openRequests.length === 0 ? (
              <Card>
                <CardDescription>
                  No open requests. Submit one and we price it within the hour
                  during business hours.
                </CardDescription>
              </Card>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {openRequests.slice(0, 5).map((r) => (
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
            )}
          </div>

          {recentEvents.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-lg font-extrabold">Recent activity</h2>
              <Card>
                <EventTimeline events={recentEvents} />
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
