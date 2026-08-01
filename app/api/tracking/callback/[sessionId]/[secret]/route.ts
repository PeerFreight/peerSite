import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { getDb } from "@/lib/db";
import { appendEvent } from "@/lib/portal/queries";
import { recordPing } from "@/lib/portal/tracking-queries";
import { getTrackingProvider } from "@/lib/tracking";

/**
 * Provider callback sink — the only unauthenticated-by-session write path in
 * the portal. Auth is the per-session secret embedded in the URL we handed
 * the provider at order creation, compared in constant time; a miss is an
 * indistinguishable 404. The body is parsed with the SESSION'S provider (not
 * the env default), so stub sessions keep working after MacroPoint
 * credentials land. Outside the middleware matcher on purpose.
 *
 * Always answers 200 once authenticated, even when the payload only partly
 * parses — providers treat non-2xx as "retry", and a poison payload must not
 * turn into a retry storm. recordPing is idempotent, so genuine retries of
 * delivered updates are absorbed too.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; secret: string }> },
) {
  const { sessionId, secret } = await params;
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.trackingSessions)
    .where(eq(schema.trackingSessions.id, sessionId))
    .limit(1);
  const session = rows[0];
  if (!session || !secretMatches(secret, session.webhookSecret)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.text();
  let updates;
  try {
    updates = getTrackingProvider(session.provider).parseCallback(
      body,
      request.headers.get("content-type") ?? "",
    );
  } catch (err) {
    console.error(`tracking callback parse failed (session ${sessionId})`, err);
    return NextResponse.json({ ok: false, error: "Unparseable payload" });
  }

  let recorded = 0;
  for (const update of updates) {
    try {
      if (update.kind === "ping") {
        const { inserted } = await recordPing(db, session, update);
        if (inserted) recorded += 1;
      } else {
        await appendEvent(db, {
          organizationId: session.organizationId,
          loadId: session.loadId,
          actorType: "system",
          eventType: "tracking_status",
          payload: { sessionId: session.id, status: update.status },
        });
      }
    } catch (err) {
      console.error(`tracking callback update failed (session ${sessionId})`, err);
    }
  }
  return NextResponse.json({ ok: true, recorded });
}

function secretMatches(given: string, actual: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}
