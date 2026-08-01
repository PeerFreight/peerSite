import type { Metadata } from "next";
import type { ReactNode } from "react";
import { EventTimeline } from "@/components/portal/event-timeline";
import { LoadStatusBadge, StatusBadge } from "@/components/portal/status";
import { EmptyState } from "@/components/ui/empty-state";
import { IconClock, IconFileText, IconInbox, IconTruck } from "@/components/ui/icons";
import { ListRow } from "@/components/ui/list";
import { JoinedGrid, PanelBody, PanelHeader } from "@/components/ui/panel";
import { StatTile } from "@/components/ui/stat";
import { getDashboardSummary } from "@/lib/portal/queries";
import { equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { requireOrgSession } from "@/lib/portal/session";

export const metadata: Metadata = {
  title: "Dashboard - Peer Freight",
  robots: { index: false },
};

function ViewAll({ href }: { href: string }) {
  return (
    <a href={href} className="text-sm font-bold text-muted hover:text-ink">
      View all →
    </a>
  );
}

/** One section of the joined dashboard surface: label header + list/empty body. */
function DashboardSection({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <PanelHeader label={label} action={action} className="pb-2" />
      {children}
    </section>
  );
}

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

      <JoinedGrid className="sm:grid-cols-3">
        <StatTile
          label="Active loads"
          value={activeLoads.length}
          href="/loads"
          icon={<IconTruck size={18} />}
        />
        <StatTile
          label="In transit"
          value={inTransit}
          href="/loads"
          icon={<IconClock size={18} />}
        />
        <StatTile
          label="Open quotes"
          value={openRequests.length}
          href="/quotes"
          icon={<IconFileText size={18} />}
        />
      </JoinedGrid>

      <JoinedGrid className="lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="divide-y divide-line bg-white">
          <DashboardSection
            label="Active loads"
            action={activeLoads.length > 0 ? <ViewAll href="/loads" /> : undefined}
          >
            {activeLoads.length === 0 ? (
              <EmptyState
                icon={<IconTruck size={20} />}
                title="No active loads"
                description="Once we book a load for you, its status, timeline, carrier, and documents show up here."
              />
            ) : (
              <ul className="divide-y divide-line">
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
              </ul>
            )}
          </DashboardSection>

          <DashboardSection
            label="Open quote requests"
            action={openRequests.length > 0 ? <ViewAll href="/quotes" /> : undefined}
          >
            {openRequests.length === 0 ? (
              <EmptyState
                icon={<IconFileText size={20} />}
                title="No open requests"
                description="Submit one and we price it within the hour during business hours."
              />
            ) : (
              <ul className="divide-y divide-line">
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
              </ul>
            )}
          </DashboardSection>
        </div>

        <section className="bg-white">
          <PanelHeader label="Recent activity" className="pb-2" />
          {recentEvents.length === 0 ? (
            <EmptyState
              icon={<IconInbox size={20} />}
              title="Nothing yet"
              description="Quote and load updates land here as they happen."
            />
          ) : (
            <PanelBody className="pt-0">
              <EventTimeline events={recentEvents} />
            </PanelBody>
          )}
        </section>
      </JoinedGrid>
    </div>
  );
}
