import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPublicTracking } from "@/lib/portal/queries";

/**
 * Poll target for the public /track/<token> map. Token-authenticated, no
 * session; the payload is the same narrow projection the page renders
 * (getPublicTracking — never addresses, driver contact, or rates). 404 for
 * unknown/rotated tokens, expired links, and cancelled loads alike.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const db = await getDb();
  const payload = await getPublicTracking(db, token);
  if (!payload) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
