"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import * as schema from "@/db/schema";
import { ADMIN_DOMAIN, getAuth, isAdmin } from "@/lib/auth";
import { updateOrganizationName } from "@/lib/portal/queries";
import { requireOrgSession } from "@/lib/portal/session";

export type SettingsFormState = { error: string | null; ok: boolean } | null;

const nameSchema = z.string().trim().min(1).max(120);
const emailSchema = z.email();

/** Human copy for Better Auth APIError messages we expect; the raw strings
 * are pinned upstream (BASE_ERROR_CODES), so match on substrings. */
function authErrorMessage(err: unknown, fallback: string) {
  const raw = err instanceof Error ? err.message : "";
  if (raw.includes("Invalid password")) return "That current password is not right.";
  if (raw.includes("Credential account not found")) {
    return "Your account has no password yet — use “Set a password” instead.";
  }
  if (raw.includes("already has a password")) {
    return "You already have a password — use “Change password” instead.";
  }
  if (raw.includes("Password too short")) return "Use at least 8 characters.";
  if (raw.includes("Session expired") || raw.includes("not fresh")) {
    return "For security, sign in again first, then retry.";
  }
  return fallback;
}

/** Display-name edit via Better Auth (session-scoped; no id from the form). */
export async function updateProfileAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const parsed = nameSchema.safeParse(formData.get("name") ?? "");
  if (!parsed.success) return { error: "Enter your name.", ok: false };
  const auth = await getAuth();
  try {
    await auth.api.updateUser({ headers: await headers(), body: { name: parsed.data } });
  } catch {
    return { error: "Could not save your name. Try again.", ok: false };
  }
  // Layout revalidation so the sidebar account row picks up the new name.
  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

/** Org rename; the query layer proves membership and the owner/admin role. */
export async function updateCompanyAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { session, db, org } = await requireOrgSession();
  const parsed = nameSchema.safeParse(formData.get("name") ?? "");
  if (!parsed.success) return { error: "Enter a company name.", ok: false };
  try {
    await updateOrganizationName(db, session.user.id, org.id, parsed.data);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not rename the company.",
      ok: false,
    };
  }
  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

/** Password change for users with a credential account. revokeOtherSessions
 * signs out every other device; this one keeps its (re-set) cookie thanks to
 * the nextCookies plugin. */
export async function changePasswordAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (!currentPassword) return { error: "Enter your current password.", ok: false };
  if (newPassword.length < 8) return { error: "New password needs at least 8 characters.", ok: false };
  const auth = await getAuth();
  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: { currentPassword, newPassword, revokeOtherSessions: true },
    });
  } catch (err) {
    return { error: authErrorMessage(err, "Could not change the password. Try again."), ok: false };
  }
  return { error: null, ok: true };
}

/** First password for magic-link/social accounts (no credential row yet). */
export async function setPasswordAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 8) return { error: "Password needs at least 8 characters.", ok: false };
  const auth = await getAuth();
  try {
    await auth.api.setPassword({ headers: await headers(), body: { newPassword } });
  } catch (err) {
    return { error: authErrorMessage(err, "Could not set the password. Try again."), ok: false };
  }
  revalidatePath("/settings");
  return { error: null, ok: true };
}

/**
 * Start the change-email flow: Better Auth emails a verification link to the
 * NEW address; the email actually changes only when it is clicked. The API
 * deliberately reports success for taken addresses (anti-enumeration), so
 * the success copy must stay conditional — see the form.
 */
export async function changeEmailAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const parsed = emailSchema.safeParse(
    String(formData.get("email") ?? "").trim().toLowerCase(),
  );
  if (!parsed.success) return { error: "Enter a valid email address.", ok: false };
  const newEmail = parsed.data;
  const auth = await getAuth();
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) return { error: "Sign in again first.", ok: false };
  if (newEmail === session.user.email.toLowerCase()) {
    return { error: "That is already your sign-in email.", ok: false };
  }
  // Admin = verified founder-domain email, so a shipper moving onto the
  // domain would self-promote. The database update hook is the backstop;
  // this guard just gives a clean error before any email goes out.
  if (!isAdmin(session.user) && newEmail.endsWith(ADMIN_DOMAIN)) {
    return { error: "That email domain is reserved.", ok: false };
  }
  try {
    await auth.api.changeEmail({
      headers: h,
      body: { newEmail, callbackURL: "/settings" },
    });
  } catch (err) {
    return { error: authErrorMessage(err, "Could not start the email change. Try again."), ok: false };
  }
  return { error: null, ok: true };
}

const inviteRoleSchema = z.enum(["member", "admin"]);

/** Invite a teammate into the current org (owner/admin only — enforced by
 * the Better Auth endpoint from the session's active organization). */
export async function inviteTeammateAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { org } = await requireOrgSession();
  if (!["owner", "admin"].includes(org.role)) {
    return { error: "Only an owner or admin can invite teammates.", ok: false };
  }
  const email = emailSchema.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Enter a valid email address.", ok: false };
  const role = inviteRoleSchema.safeParse(formData.get("role") ?? "member");
  if (!role.success) return { error: "Pick a role.", ok: false };
  const auth = await getAuth();
  try {
    await auth.api.createInvitation({
      headers: await headers(),
      body: { email: email.data, role: role.data, organizationId: org.id },
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : "";
    if (raw.includes("already a member")) {
      return { error: "That person is already on your team.", ok: false };
    }
    if (raw.includes("already invited")) {
      return { error: "That person already has a pending invitation.", ok: false };
    }
    return { error: "Could not send the invitation. Try again.", ok: false };
  }
  revalidatePath("/settings");
  return { error: null, ok: true };
}

/** Cancel a pending invitation. Ownership is proven with a direct query
 * first so a forged invitation id from another org dies here. */
export async function cancelInvitationAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { db, org } = await requireOrgSession();
  if (!["owner", "admin"].includes(org.role)) {
    return { error: "Only an owner or admin can manage invitations.", ok: false };
  }
  const invitationId = String(formData.get("invitationId") ?? "");
  if (!invitationId) return { error: "Missing invitation.", ok: false };
  const rows = await db
    .select({ id: schema.invitation.id })
    .from(schema.invitation)
    .where(
      and(eq(schema.invitation.id, invitationId), eq(schema.invitation.organizationId, org.id)),
    )
    .limit(1);
  if (rows.length === 0) return { error: "That invitation no longer exists.", ok: false };
  const auth = await getAuth();
  try {
    await auth.api.cancelInvitation({
      headers: await headers(),
      body: { invitationId },
    });
  } catch {
    return { error: "Could not cancel the invitation. Try again.", ok: false };
  }
  revalidatePath("/settings");
  return { error: null, ok: true };
}
