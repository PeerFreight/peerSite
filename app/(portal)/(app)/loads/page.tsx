import type { Metadata } from "next";
import { DelayBadge, LoadStatusBadge } from "@/components/portal/status";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTruck } from "@/components/ui/icons";
import { ListPanel, ListRow } from "@/components/ui/list";
import { Panel } from "@/components/ui/panel";
import { listLoads } from "@/lib/portal/queries";
import { equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { requireOrgSession } from "@/lib/portal/session";

export const metadata: Metadata = {
  title: "Loads - Peer Freight",
  robots: { index: false },
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default async function LoadsPage() {
  const { session, db, org } = await requireOrgSession();
  const loads = await listLoads(db, session.user.id, org.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Loads</h1>
          <p className="mt-1 text-muted">Every load booked under {org.name}.</p>
        </div>
        <LinkButton href="/quotes/new">Request a quote</LinkButton>
      </div>

      {loads.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<IconTruck size={20} />}
            title="No loads yet"
            description="Once we book a load from one of your quotes, its status, timeline, carrier, and documents live here."
          />
        </Panel>
      ) : (
        <ListPanel>
          {loads.map((l) => (
            <ListRow key={l.id} href={`/loads/${l.id}`}>
              <span className="w-24 text-sm font-extrabold tabular-nums text-navy">
                {l.reference}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{laneSummary(l)}</p>
                <p className="mt-0.5 truncate text-sm text-muted">
                  Pickup {dateFmt.format(new Date(`${l.pickupDate}T12:00:00`))} ·{" "}
                  {equipmentLabel(l.equipment)} · {l.commodity}
                </p>
              </div>
              <DelayBadge delayedAt={l.delayedAt} revisedDeliveryDate={l.revisedDeliveryDate} />
              <LoadStatusBadge status={l.status} />
            </ListRow>
          ))}
        </ListPanel>
      )}
    </div>
  );
}
