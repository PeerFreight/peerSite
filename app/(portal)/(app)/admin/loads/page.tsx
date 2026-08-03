import type { Metadata } from "next";
import { LoadStatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTruck } from "@/components/ui/icons";
import { ListPanel, ListRow } from "@/components/ui/list";
import { Panel } from "@/components/ui/panel";
import { listLoadsForAdmin } from "@/lib/portal/admin-queries";
import { formatDateDisplay } from "@/lib/portal/dates";
import { equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { requireAdminSession } from "@/lib/portal/session";
import { AdminNav } from "../admin-nav";

export const metadata: Metadata = {
  title: "Loads (admin) - Peer Freight",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoadsPage() {
  const { session, db } = await requireAdminSession();
  const loads = await listLoadsForAdmin(db, session.user);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Loads</h1>
          <p className="mt-1 text-muted">
            Every booked load across every shipper; active lifecycle first.
          </p>
        </div>
        <AdminNav active="loads" />
      </div>

      {loads.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<IconTruck size={20} />}
            title="No loads booked"
            description="Book one from an agreed quote in the queue."
          />
        </Panel>
      ) : (
        <ListPanel>
          {loads.map((l) => (
            <ListRow key={l.id} href={`/admin/loads/${l.id}`}>
              <span className="w-24 text-sm font-extrabold tabular-nums text-navy">
                {l.reference}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">
                  {l.orgName} · {laneSummary(l)}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted">
                  Pickup {formatDateDisplay(l.pickupDate)} · {equipmentLabel(l.equipment)} · {l.commodity}
                </p>
              </div>
              {l.hazmat ? <Badge tone="red">Hazmat</Badge> : null}
              <LoadStatusBadge status={l.status} />
            </ListRow>
          ))}
        </ListPanel>
      )}
    </div>
  );
}
