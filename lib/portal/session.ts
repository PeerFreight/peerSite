import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listUserOrganizations } from "@/lib/portal/queries";
import { isAdmin } from "@/lib/portal/roles";

/**
 * Server-side session guards for portal pages and actions. Middleware only
 * checks cookie presence; these re-validate the session (and membership /
 * admin role) properly on every request.
 */

/** Signed-in shipper with an org profile; redirects through the funnel otherwise. */
export async function requireOrgSession() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const db = await getDb();
  const orgs = await listUserOrganizations(db, session.user.id);
  if (orgs.length === 0) redirect("/onboarding");
  return { session, db, org: orgs[0] };
}

/** Verified founder-domain account; everyone else lands on /dashboard. */
export async function requireAdminSession() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (!isAdmin(session.user)) redirect("/dashboard");
  const db = await getDb();
  return { session, db };
}
