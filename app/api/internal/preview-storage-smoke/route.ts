import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Preview-only deployment check for the real GCS upload and V4 signed-download
 * path. Vercel Deployment Protection is the outer authorization boundary.
 * This route is removed after the pre-production check passes.
 */
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new NextResponse(null, { status: 404 });
  }

  const marker = `peer-freight-storage-smoke:${randomUUID()}`;
  const path = `smoke-tests/${randomUUID()}.txt`;
  const storage = getStorage();

  await storage.put(path, Buffer.from(marker), "text/plain; charset=utf-8");
  const download = await storage.getDownload(path, "portal-storage-smoke.txt", "text/plain");
  if (download.kind !== "url") {
    return NextResponse.json({ ok: false, reason: "preview did not select GCS" }, { status: 500 });
  }

  const response = await fetch(download.url, { cache: "no-store" });
  const body = await response.text();
  if (!response.ok || body !== marker) {
    return NextResponse.json(
      { ok: false, reason: "signed download did not round-trip", downloadStatus: response.status },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, upload: "gcs", download: "v4-signed-url" });
}
