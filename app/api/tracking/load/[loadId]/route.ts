import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getTrackingForLoad, listUserOrganizations } from "@/lib/portal/queries";
import { getTrackingForAdmin } from "@/lib/portal/tracking-queries";
import { isAdmin } from "@/lib/portal/roles";

/**
 * Poll target for the logged-in load pages (shipper and admin), session-gated
 * like /api/documents/[id]. Deliberately separate from the public token
 * route: revoking or expiring the public link must never break the
 * authenticated view.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ loadId: string }> },
) {
  const { loadId } = await params;
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const db = await getDb();
  let pings: { lat: number; lng: number; recordedAt: Date }[] | null = null;
  let lastPingAt: Date | null = null;
  if (isAdmin(session.user)) {
    const tracking = await getTrackingForAdmin(db, session.user, loadId);
    if (tracking) {
      pings = tracking.pings;
      lastPingAt = tracking.session.lastPingAt;
    }
  } else {
    const orgs = await listUserOrganizations(db, session.user.id);
    if (orgs.length > 0) {
      const tracking = await getTrackingForLoad(db, session.user.id, orgs[0].id, loadId);
      if (tracking) {
        pings = tracking.pings;
        lastPingAt = tracking.session.lastPingAt;
      }
    }
  }
  if (!pings) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(
    {
      pings: pings.map((p) => ({ lat: p.lat, lng: p.lng, recordedAt: p.recordedAt.toISOString() })),
      lastPingAt: lastPingAt?.toISOString() ?? null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
