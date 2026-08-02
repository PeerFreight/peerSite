import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IconReceipt } from "@/components/ui/icons";
import { ListPanel, ListRow } from "@/components/ui/list";
import { Panel } from "@/components/ui/panel";
import { INVOICE_STATUS_LABELS, listInvoices } from "@/lib/portal/invoices";
import { laneSummary } from "@/lib/portal/rfq";
import { requireOrgSession } from "@/lib/portal/session";

export const metadata: Metadata = {
  title: "Invoices - Peer Freight",
  robots: { index: false },
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function fmtDate(iso: string) {
  return dateFmt.format(new Date(`${iso}T12:00:00`));
}

export default async function InvoicesPage() {
  const { session, db, org } = await requireOrgSession();
  const invoices = await listInvoices(db, session.user.id, org.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Invoices</h1>
        <p className="mt-1 text-muted">Every invoice issued to {org.name}.</p>
      </div>

      {invoices.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<IconReceipt size={20} />}
            title="No invoices yet"
            description="Once a load delivers, its invoice posts here with the amount and due date."
          />
        </Panel>
      ) : (
        <ListPanel>
          {invoices.map((inv) => (
            <ListRow key={inv.id} href={`/loads/${inv.loadId}`}>
              <span className="w-24 text-sm font-extrabold tabular-nums text-navy">
                {inv.number}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">
                  {inv.reference} · {laneSummary(inv)}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted">
                  Due {fmtDate(inv.dueDate)}
                  {inv.status === "paid" && inv.paidAt
                    ? ` · paid ${dateFmt.format(inv.paidAt)}`
                    : ""}
                </p>
              </div>
              <span className="text-sm font-extrabold tabular-nums text-ink">
                ${Number(inv.amountUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <Badge tone={inv.status === "paid" ? "green" : inv.status === "void" ? "neutral" : "gold"}>
                {INVOICE_STATUS_LABELS[inv.status]}
              </Badge>
            </ListRow>
          ))}
        </ListPanel>
      )}
    </div>
  );
}
