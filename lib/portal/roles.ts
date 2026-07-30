/** Founder/admin domain. Admin rights never attach to a customer domain. */
export const ADMIN_DOMAIN = "@peer-freight.com";

export type PortalUser = { email: string; emailVerified: boolean };

/** Portal admins are verified founder-domain accounts. */
export function isAdmin(user: PortalUser) {
  return user.emailVerified && user.email.toLowerCase().endsWith(ADMIN_DOMAIN);
}

/** Admin proof used by every admin query; throws on failure. */
export function assertAdmin(user: PortalUser) {
  if (!isAdmin(user)) throw new Error("Admin only");
}
