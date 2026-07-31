"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { updateOrganizationName } from "@/lib/portal/queries";
import { requireOrgSession } from "@/lib/portal/session";

export type SettingsFormState = { error: string | null; ok: boolean } | null;

const nameSchema = z.string().trim().min(1).max(120);

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
