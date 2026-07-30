import type { Metadata } from "next";
import { AppShell } from "@/components/portal/app-shell";
import { PortalNav } from "@/components/portal/portal-nav";
import { StatusBadge } from "@/components/portal/status";
import { LinkButton } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listQuoteRequests } from "@/lib/portal/queries";
import { equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { isAdmin } from "@/lib/portal/roles";
import { requireOrgSession } from "@/lib/portal/session";
import { SignOutButton } from "../sign-out-button";

export const metadata: Metadata = {
  title: "Quotes - Peer Freight",
  robots: { index: false },
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default async function QuotesPage() {
  const { session, db, org } = await requireOrgSession();
  const requests = await listQuoteRequests(db, session.user.id, org.id);

  return (
    <AppShell
      nav={<PortalNav active="quotes" admin={isAdmin(session.user)} />}
      user={<SignOutButton label={session.user.name} />}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Quotes</h1>
            <p className="mt-1 text-muted">Every quote request under {org.name}.</p>
          </div>
          <LinkButton href="/quotes/new">New quote request</LinkButton>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardTitle>No quote requests yet</CardTitle>
            <CardDescription>
              Submit your first one and we will price it within the hour during
              business hours.
            </CardDescription>
            <div className="mt-4">
              <LinkButton href="/quotes/new">Request a quote</LinkButton>
            </div>
          </Card>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {requests.map((r) => (
              <li key={r.id}>
                <a
                  href={`/quotes/${r.id}`}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-paper"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{laneSummary(r)}</p>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      Pickup {dateFmt.format(new Date(`${r.pickupDate}T12:00:00`))} ·{" "}
                      {equipmentLabel(r.equipment)} · {r.commodity}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
