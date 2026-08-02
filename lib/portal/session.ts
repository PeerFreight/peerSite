import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getOrganizationForUser, listUserOrganizations } from "@/lib/portal/queries";
import { isAdmin } from "@/lib/portal/roles";
import type { PortalDb } from "@/lib/portal/queries";

/**
 * Server-side session guards for portal pages and actions. Middleware only
 * checks cookie presence; these re-validate the session (and membership /
 * admin role) properly on every request.
 */

/** One session fetch per request: the (app) layout and the page it renders
 * both need the session, so the raw lookup is request-cached. Reads the
 * mutable cookie store rather than the raw request headers so a re-render
 * right after a server action that rotated the session cookie (e.g.
 * change-password revoking sessions) sees the fresh token, not the dead one. */
const getSession = cache(async () => {
  const auth = await getAuth();
  const cookieHeader = (await cookies()).toString();
  return auth.api.getSession({ headers: new Headers({ cookie: cookieHeader }) });
});

/** The org this session operates as: the session's active org when the user
 * is (still) a member of it, else their first membership. Invited teammates
 * are the first real multi-org case — first-row order is not enough. */
async function resolveOrg(
  db: PortalDb,
  userId: string,
  activeOrganizationId: string | null | undefined,
) {
  if (activeOrganizationId) {
    const active = await getOrganizationForUser(db, userId, activeOrganizationId);
    if (active) return active;
  }
  const orgs = await listUserOrganizations(db, userId);
  return orgs[0] ?? null;
}

/** Signed-in shipper with an org profile; redirects through the funnel otherwise. */
export async function requireOrgSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  const db = await getDb();
  const org = await resolveOrg(db, session.user.id, session.session.activeOrganizationId);
  if (!org) redirect("/onboarding");
  return { session, db, org };
}

/** Verified founder-domain account; everyone else lands on /dashboard. */
export async function requireAdminSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.user)) redirect("/dashboard");
  const db = await getDb();
  return { session, db };
}

/** Shell (sidebar) session: signed-in user, current-org name if any, admin
 * flag. Deliberately no onboarding redirect — admins may have zero orgs and
 * still need the /admin shell; each page keeps its own strict guard. */
export async function getShellSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  const db = await getDb();
  const org = await resolveOrg(db, session.user.id, session.session.activeOrganizationId);
  return {
    name: session.user.name,
    email: session.user.email,
    orgName: org?.name ?? null,
    admin: isAdmin(session.user),
  };
}
