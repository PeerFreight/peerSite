import type { Metadata } from "next";
import { AppShell } from "@/components/portal/app-shell";
import { PortalNav } from "@/components/portal/portal-nav";
import { LoadStatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listLoadsForAdmin } from "@/lib/portal/admin-queries";
import { equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { requireAdminSession } from "@/lib/portal/session";
import { AdminNav } from "../admin-nav";
import { SignOutButton } from "../../sign-out-button";

export const metadata: Metadata = {
  title: "Loads (admin) - Peer Freight",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoadsPage() {
  const { session, db } = await requireAdminSession();
  const loads = await listLoadsForAdmin(db, session.user);

  return (
    <AppShell
      nav={<PortalNav active="admin" admin />}
      user={<SignOutButton label={session.user.name} />}
    >
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
          <Card>
            <CardTitle>No loads booked</CardTitle>
            <CardDescription>Book one from an agreed quote in the queue.</CardDescription>
          </Card>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {loads.map((l) => (
              <li key={l.id}>
                <a
                  href={`/admin/loads/${l.id}`}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-paper"
                >
                  <span className="w-24 text-sm font-extrabold tabular-nums text-navy">
                    {l.reference}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">
                      {l.orgName} · {laneSummary(l)}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      Pickup {l.pickupDate} · {equipmentLabel(l.equipment)} · {l.commodity}
                    </p>
                  </div>
                  {l.hazmat ? <Badge tone="red">Hazmat</Badge> : null}
                  <LoadStatusBadge status={l.status} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
