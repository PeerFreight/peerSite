import { cache } from "react";
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

/** One session fetch per request: the (app) layout and the page it renders
 * both need the session, so the raw lookup is request-cached. */
const getSession = cache(async () => {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await headers() });
});

/** Signed-in shipper with an org profile; redirects through the funnel otherwise. */
export async function requireOrgSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  const db = await getDb();
  const orgs = await listUserOrganizations(db, session.user.id);
  if (orgs.length === 0) redirect("/onboarding");
  return { session, db, org: orgs[0] };
}

/** Verified founder-domain account; everyone else lands on /dashboard. */
export async function requireAdminSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.user)) redirect("/dashboard");
  const db = await getDb();
  return { session, db };
}

/** Shell (sidebar) session: signed-in user, first-org name if any, admin
 * flag. Deliberately no onboarding redirect — admins may have zero orgs and
 * still need the /admin shell; each page keeps its own strict guard. */
export async function getShellSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  const db = await getDb();
  const orgs = await listUserOrganizations(db, session.user.id);
  return {
    name: session.user.name,
    email: session.user.email,
    orgName: orgs[0]?.name ?? null,
    admin: isAdmin(session.user),
  };
}
