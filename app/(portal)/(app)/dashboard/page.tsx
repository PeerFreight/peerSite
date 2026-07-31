import type { Metadata } from "next";
import { EventTimeline } from "@/components/portal/event-timeline";
import { LoadStatusBadge, StatusBadge } from "@/components/portal/status";
import { EmptyState } from "@/components/ui/empty-state";
import { IconFileText, IconInbox, IconTruck } from "@/components/ui/icons";
import { ListPanel, ListRow } from "@/components/ui/list";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { StatTile } from "@/components/ui/stat";
import { getDashboardSummary } from "@/lib/portal/queries";
import { equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { requireOrgSession } from "@/lib/portal/session";

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
  const inTransit = activeLoads.filter((l) => l.status === "in_transit").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">{org.name}</h1>
        <p className="mt-1 text-muted">Welcome, {session.user.name.split(" ")[0]}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Active loads" value={activeLoads.length} href="/loads" />
        <StatTile label="In transit" value={inTransit} href="/loads" />
        <StatTile label="Open quotes" value={openRequests.length} href="/quotes" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {activeLoads.length === 0 ? (
            <Panel>
              <PanelHeader label="Active loads" />
              <EmptyState
                icon={<IconTruck size={20} />}
                title="No active loads"
                description="Once we book a load for you, its status, timeline, carrier, and documents show up here."
              />
            </Panel>
          ) : (
            <ListPanel
              label="Active loads"
              action={
                <a href="/loads" className="text-sm font-bold text-muted hover:text-ink">
                  View all →
                </a>
              }
            >
              {activeLoads.slice(0, 5).map((l) => (
                <ListRow key={l.id} href={`/loads/${l.id}`}>
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
                </ListRow>
              ))}
            </ListPanel>
          )}

          {openRequests.length === 0 ? (
            <Panel>
              <PanelHeader label="Open quote requests" />
              <EmptyState
                icon={<IconFileText size={20} />}
                title="No open requests"
                description="Submit one and we price it within the hour during business hours."
              />
            </Panel>
          ) : (
            <ListPanel
              label="Open quote requests"
              action={
                <a href="/quotes" className="text-sm font-bold text-muted hover:text-ink">
                  View all →
                </a>
              }
            >
              {openRequests.slice(0, 5).map((r) => (
                <ListRow key={r.id} href={`/quotes/${r.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{laneSummary(r)}</p>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {equipmentLabel(r.equipment)} · {r.commodity}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </ListRow>
              ))}
            </ListPanel>
          )}
        </div>

        <Panel className="self-start">
          <PanelHeader label="Recent activity" />
          {recentEvents.length === 0 ? (
            <EmptyState
              icon={<IconInbox size={20} />}
              title="Nothing yet"
              description="Quote and load updates land here as they happen."
            />
          ) : (
            <PanelBody>
              <EventTimeline events={recentEvents} />
            </PanelBody>
          )}
        </Panel>
      </div>
    </div>
  );
}
