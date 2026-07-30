import type { Metadata } from "next";
import { AppShell } from "@/components/portal/app-shell";
import { PortalNav } from "@/components/portal/portal-nav";
import { StatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listOpenQuoteRequests } from "@/lib/portal/admin-queries";
import { equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { requireAdminSession } from "@/lib/portal/session";
import { SignOutButton } from "../sign-out-button";

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
    <AppShell
      nav={<PortalNav active="admin" admin />}
      user={<SignOutButton label={session.user.name} />}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold">Quote queue</h1>
          <p className="mt-1 text-muted">
            Open requests across every shipper, oldest first. The product is a
            quote within the hour.
          </p>
        </div>

        {open.length === 0 ? (
          <Card>
            <CardTitle>Queue is clear</CardTitle>
            <CardDescription>No open quote requests right now.</CardDescription>
          </Card>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {open.map((r) => {
              const overdue = Date.now() - r.createdAt.getTime() > 60 * 60000 && r.status === "submitted";
              return (
                <li key={r.id}>
                  <a
                    href={`/admin/quotes/${r.id}`}
                    className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-paper"
                  >
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
                        Pickup {r.pickupDate} · {equipmentLabel(r.equipment)} · {r.commodity}
                      </p>
                    </div>
                    {r.hazmat ? <Badge tone="red">Hazmat</Badge> : null}
                    <StatusBadge status={r.status} />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
