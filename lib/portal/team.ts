import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import {
  appendEvent,
  findPendingInvitationForEmail,
  type PortalDb,
} from "@/lib/portal/queries";
import { assertAdmin } from "@/lib/portal/roles";
import type { AdminUser } from "@/lib/portal/admin-queries";

/**
 * Founder/agent teammate-invite path. Shipper-side invites go through the
 * Better Auth plugin API (Settings → auth.api.createInvitation, which
 * proves org membership itself). Founders are not members of customer
 * orgs, so this writes a plugin-shaped invitation row directly — the
 * /invite/[id] accept flow can't tell the difference. Reads (members,
 * pending invitations, accept-page lookup) live in lib/portal/queries.ts.
 */

/** Matches the Better Auth organization plugin's default invitation expiry. */
export const INVITE_TTL_HOURS = 48;

/** Roles a teammate can hold; `owner` stays with the person who onboarded. */
export const INVITABLE_ROLES = ["member", "admin"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export async function inviteTeammateAsAdmin(
  db: PortalDb,
  admin: AdminUser,
  orgId: string,
  email: string,
  role: InvitableRole = "member",
) {
  assertAdmin(admin);
  const normalized = email.trim().toLowerCase();
  const orgRows = await db
    .select({ id: schema.organization.id, name: schema.organization.name })
    .from(schema.organization)
    .where(eq(schema.organization.id, orgId))
    .limit(1);
  const org = orgRows[0];
  if (!org) throw new Error("Organization not found");

  const existingMember = await db
    .select({ id: schema.member.id })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(and(eq(schema.member.organizationId, orgId), eq(schema.user.email, normalized)))
    .limit(1);
  if (existingMember.length > 0) throw new Error(`${normalized} is already a member`);
  if (await findPendingInvitationForEmail(db, normalized)) {
    throw new Error(`${normalized} already has a pending invite`);
  }

  const invitationId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);
  await db.transaction(async (tx) => {
    await tx.insert(schema.invitation).values({
      id: invitationId,
      organizationId: orgId,
      email: normalized,
      role,
      status: "pending",
      expiresAt,
      inviterId: admin.id,
    });
    await appendEvent(tx, {
      organizationId: orgId,
      actorType: "admin",
      actorId: admin.id,
      eventType: "teammate_invited",
      payload: { email: normalized, role },
      via: admin.via,
    });
  });
  return { invitationId, email: normalized, role, orgName: org.name, expiresAt };
}
