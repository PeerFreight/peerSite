import { and, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";

/**
 * Org-scoped query layer. The browser never touches the database; every
 * portal read/write goes through functions here, and every function takes
 * the session's userId and filters through membership. Nothing in this file
 * may accept an orgId without also proving the user belongs to it.
 */
export type PortalDb = PgDatabase<PgQueryResultHKT, typeof schema>;

export async function listUserOrganizations(db: PortalDb, userId: string) {
  return db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      role: schema.member.role,
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
    .where(eq(schema.member.userId, userId));
}

/** Returns the org only if the user is a member; null otherwise. */
export async function getOrganizationForUser(db: PortalDb, userId: string, orgId: string) {
  const rows = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      role: schema.member.role,
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
    .where(and(eq(schema.member.userId, userId), eq(schema.member.organizationId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Membership proof used by every org-scoped mutation; throws on failure. */
export async function requireMembership(db: PortalDb, userId: string, orgId: string) {
  const org = await getOrganizationForUser(db, userId, orgId);
  if (!org) throw new Error("Not a member of this organization");
  return org;
}
