import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getDocumentForAdmin } from "@/lib/portal/admin-queries";
import { getDocumentForUser, listUserOrganizations } from "@/lib/portal/queries";
import { isAdmin } from "@/lib/portal/roles";
import { getStorage } from "@/lib/storage";

/**
 * The only download path for documents. Proves the session, then membership
 * and shipper visibility (or the admin role) before handing out the file —
 * in production as a ~60s V4 signed URL redirect, in dev by streaming the
 * bytes. Unsigned bucket URLs never work.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const db = await getDb();
  let doc = null;
  if (isAdmin(session.user)) {
    doc = await getDocumentForAdmin(db, session.user, id);
  } else {
    const orgs = await listUserOrganizations(db, session.user.id);
    if (orgs.length > 0) {
      doc = await getDocumentForUser(db, session.user.id, orgs[0].id, id);
    }
  }
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const download = await getStorage().getDownload(doc.storagePath, doc.filename, doc.contentType);
  if (download.kind === "url") {
    return NextResponse.redirect(download.url, 302);
  }
  return new NextResponse(new Uint8Array(download.bytes), {
    headers: {
      "Content-Type": download.contentType,
      "Content-Disposition": `attachment; filename="${doc.filename.replaceAll('"', "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
