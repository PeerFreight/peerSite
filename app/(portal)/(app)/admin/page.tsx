import type { Metadata } from "next";
import { StatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IconInbox } from "@/components/ui/icons";
import { ListPanel, ListRow } from "@/components/ui/list";
import { Panel } from "@/components/ui/panel";
import { listOpenQuoteRequests } from "@/lib/portal/admin-queries";
import { formatDateDisplay } from "@/lib/portal/dates";
import { equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { requireAdminSession } from "@/lib/portal/session";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = {
  title: "Admin - Peer Freight",
  robots: { index: false },
};

// The queue must always show the current waiting time.
export const dynamic = "force-dynamic";

function age(from: Date) {
  const mins = Math.max(0, Math.floor((Date.now() - from.getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export default async function AdminQueuePage() {
  const { session, db } = await requireAdminSession();
  const open = await listOpenQuoteRequests(db, session.user);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Quote queue</h1>
          <p className="mt-1 text-muted">
            Open requests across every shipper, oldest first. The product is a
            quote within the hour.
          </p>
        </div>
        <AdminNav active="queue" />
      </div>

      {open.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<IconInbox size={20} />}
            title="Queue is clear"
            description="No open quote requests right now."
          />
        </Panel>
      ) : (
        <ListPanel>
          {open.map((r) => {
            const overdue = Date.now() - r.createdAt.getTime() > 60 * 60000 && r.status === "submitted";
            return (
              <ListRow key={r.id} href={`/admin/quotes/${r.id}`}>
                <span
                  className={`w-16 text-sm font-extrabold tabular-nums ${overdue ? "text-red-700" : "text-muted"}`}
                  title="Waiting"
                >
                  {age(r.createdAt)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">
                    {r.orgName} · {laneSummary(r)}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    Pickup {formatDateDisplay(r.pickupDate)} · {equipmentLabel(r.equipment)} · {r.commodity}
                  </p>
                </div>
                {r.hazmat ? (
                  <Badge tone="red">{r.hazmatClass ? `Hazmat ${r.hazmatClass}` : "Hazmat"}</Badge>
                ) : null}
                <StatusBadge status={r.status} />
              </ListRow>
            );
          })}
        </ListPanel>
      )}
    </div>
  );
}
