import type { Metadata } from "next";
import { StatusBadge } from "@/components/portal/status";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconFileText } from "@/components/ui/icons";
import { ListPanel, ListRow } from "@/components/ui/list";
import { Panel } from "@/components/ui/panel";
import { listQuoteRequests } from "@/lib/portal/queries";
import { equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { requireOrgSession } from "@/lib/portal/session";

export const metadata: Metadata = {
  title: "Quotes - Peer Freight",
  robots: { index: false },
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default async function QuotesPage() {
  const { session, db, org } = await requireOrgSession();
  const requests = await listQuoteRequests(db, session.user.id, org.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Quotes</h1>
          <p className="mt-1 text-muted">Every quote request under {org.name}.</p>
        </div>
        <LinkButton href="/quotes/new">Request a quote</LinkButton>
      </div>

      {requests.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<IconFileText size={20} />}
            title="No quote requests yet"
            description="Submit your first one and we will price it within the hour during business hours."
          />
        </Panel>
      ) : (
        <ListPanel>
          {requests.map((r) => (
            <ListRow key={r.id} href={`/quotes/${r.id}`}>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{laneSummary(r)}</p>
                <p className="mt-0.5 truncate text-sm text-muted">
                  Pickup {dateFmt.format(new Date(`${r.pickupDate}T12:00:00`))} ·{" "}
                  {equipmentLabel(r.equipment)} · {r.commodity}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </ListRow>
          ))}
        </ListPanel>
      )}
    </div>
  );
}
