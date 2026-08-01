import type { Metadata } from "next";
import type { LoadStatus } from "@/db/schema";
import { LoadStatusBadge } from "@/components/portal/status";
import { TrackingMap } from "@/components/portal/tracking-map";
import { Card } from "@/components/ui/card";
import { getDb } from "@/lib/db";
import { getPublicTracking } from "@/lib/portal/queries";

/**
 * The public tracking page: what the shipper (or anyone they forward the
 * link to) sees with no login. Lives inside (portal) for the font/styles but
 * outside (app) — the same placement as /login — so no session shell wraps
 * it. Everything shown comes from the narrow getPublicTracking projection;
 * the full breadcrumb is deliberate (transparency is the differentiator),
 * the addresses, driver, and rate are deliberately absent.
 */

export const metadata: Metadata = {
  title: "Track shipment - Peer Freight",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const etaFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
});

function Wordmark() {
  return (
    <a href="/" className="flex items-center gap-2.5" aria-label="Peer Freight home">
      <img src="/site/peer-logo-mark.png" alt="" width={30} height={30} draggable={false} />
      <span className="text-lg font-extrabold tracking-tight">
        <span className="text-white">Peer</span> <span className="text-gold">Freight</span>
      </span>
    </a>
  );
}

export default async function PublicTrackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = await getDb();
  const data = await getPublicTracking(db, token);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="bg-navy px-6 py-4">
        <div className="mx-auto w-full max-w-3xl">
          <Wordmark />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {data ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold text-ink">
                {data.reference} · {data.originCity}, {data.originState} →{" "}
                {data.destCity}, {data.destState}
              </h1>
              <LoadStatusBadge status={data.loadStatus as LoadStatus} />
            </div>
            {data.etaAt ? (
              <p className="text-sm text-muted">
                Estimated delivery: {etaFmt.format(new Date(data.etaAt))} PT
              </p>
            ) : null}
            <Card>
              <TrackingMap
                originLat={data.originLat}
                originLng={data.originLng}
                destLat={data.destLat}
                destLng={data.destLng}
                pings={data.pings}
                lastPingAt={data.lastPingAt}
                pollUrl={`/api/tracking/public/${token}`}
              />
            </Card>
            <p className="text-xs text-muted">
              Live location reported by the carrier&apos;s driver. Questions about this
              shipment? Email{" "}
              <a href="mailto:team@peer-freight.com" className="font-bold hover:text-ink">
                team@peer-freight.com
              </a>
              .
            </p>
          </div>
        ) : (
          <Card className="mx-auto max-w-md text-center">
            <h1 className="text-xl font-extrabold text-ink">
              This tracking link is no longer active
            </h1>
            <p className="mt-2 text-sm text-muted">
              Tracking links expire after delivery, and the shipper can revoke them at
              any time. If you think this one should still work, email{" "}
              <a href="mailto:team@peer-freight.com" className="font-bold hover:text-ink">
                team@peer-freight.com
              </a>{" "}
              and we will sort it out.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
