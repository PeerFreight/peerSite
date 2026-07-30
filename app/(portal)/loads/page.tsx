import type { Metadata } from "next";
import { AppShell } from "@/components/portal/app-shell";
import { PortalNav } from "@/components/portal/portal-nav";
import { LoadStatusBadge } from "@/components/portal/status";
import { LinkButton } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listLoads } from "@/lib/portal/queries";
import { equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { isAdmin } from "@/lib/portal/roles";
import { requireOrgSession } from "@/lib/portal/session";
import { SignOutButton } from "../sign-out-button";

export const metadata: Metadata = {
  title: "Loads - Peer Freight",
  robots: { index: false },
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default async function LoadsPage() {
  const { session, db, org } = await requireOrgSession();
  const loads = await listLoads(db, session.user.id, org.id);

  return (
    <AppShell
      nav={<PortalNav active="loads" admin={isAdmin(session.user)} />}
      user={<SignOutButton label={session.user.name} />}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold">Loads</h1>
          <p className="mt-1 text-muted">Every load booked under {org.name}.</p>
        </div>

        {loads.length === 0 ? (
          <Card>
            <CardTitle>No loads yet</CardTitle>
            <CardDescription>
              Once we book a load from one of your quotes, its status, timeline,
              carrier, and documents live here.
            </CardDescription>
            <div className="mt-4">
              <LinkButton href="/quotes/new">Request a quote</LinkButton>
            </div>
          </Card>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {loads.map((l) => (
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
                      Pickup {dateFmt.format(new Date(`${l.pickupDate}T12:00:00`))} ·{" "}
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
    </AppShell>
  );
}
