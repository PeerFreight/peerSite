import { and, eq, sql } from "drizzle-orm";
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

/**
 * Founder/agent cancel of a pending invitation, by invitation id or invitee
 * email. Writes the same "canceled" status the Better Auth cancelInvitation
 * endpoint uses (shipper-side Settings path), so both paths look identical
 * to the accept page and the pending list.
 */
export async function cancelInvitationAsAdmin(db: PortalDb, admin: AdminUser, ref: string) {
  assertAdmin(admin);
  const normalized = ref.trim();
  const byId = await db
    .select()
    .from(schema.invitation)
    .where(eq(schema.invitation.id, normalized))
    .limit(1);
  const invitation =
    byId[0] ?? (await findPendingInvitationRow(db, normalized.toLowerCase()));
  if (!invitation) throw new Error(`No invitation matching "${ref}"`);
  if (invitation.status !== "pending") {
    throw new Error(`That invitation is already ${invitation.status}`);
  }
  const orgRows = await db
    .select({ name: schema.organization.name })
    .from(schema.organization)
    .where(eq(schema.organization.id, invitation.organizationId))
    .limit(1);
  await db.transaction(async (tx) => {
    await tx
      .update(schema.invitation)
      .set({ status: "canceled" })
      .where(eq(schema.invitation.id, invitation.id));
    await appendEvent(tx, {
      organizationId: invitation.organizationId,
      actorType: "admin",
      actorId: admin.id,
      eventType: "teammate_invite_cancelled",
      payload: { email: invitation.email },
      via: admin.via,
    });
  });
  return {
    invitationId: invitation.id,
    email: invitation.email,
    orgName: orgRows[0]?.name ?? invitation.organizationId,
  };
}

/** Pending, unexpired invitation row for an email (full row, unlike the
 * narrow projection in queries.ts). */
async function findPendingInvitationRow(db: PortalDb, email: string) {
  const rows = await db
    .select()
    .from(schema.invitation)
    .where(
      and(
        sql`lower(${schema.invitation.email}) = ${email}`,
        eq(schema.invitation.status, "pending"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
