"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { changePasswordAction, setPasswordAction, type SettingsFormState } from "./actions";

/**
 * Set vs Change is decided server-side (hasCredentialAccount): magic-link
 * and social accounts have no password yet, so they get the set-a-password
 * form instead of a "current password" field they cannot fill.
 */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  return hasPassword ? <ChangePasswordForm /> : <SetPasswordForm />;
}

function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    changePasswordAction,
    null,
  );
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Current password" htmlFor="current-password">
        <PasswordInput
          id="current-password"
          name="currentPassword"
          autoComplete="current-password"
          required
        />
      </Field>
      <Field
        label="New password"
        htmlFor="new-password"
        hint="At least 8 characters. Changing it signs out your other devices."
        error={state?.error ?? undefined}
      >
        <PasswordInput
          id="new-password"
          name="newPassword"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="navy" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Change password"}
        </Button>
        {state?.ok ? (
          <p className="text-sm font-bold text-green-800">Password changed.</p>
        ) : null}
      </div>
    </form>
  );
}

function SetPasswordForm() {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    setPasswordAction,
    null,
  );
  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted">
        You sign in with email links{" "}
        <span className="whitespace-nowrap">(or Google/Microsoft)</span>. Set a
        password to also sign in the classic way.
      </p>
      <Field
        label="New password"
        htmlFor="set-password"
        hint="At least 8 characters."
        error={state?.error ?? undefined}
      >
        <PasswordInput
          id="set-password"
          name="newPassword"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="navy" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Set password"}
        </Button>
        {state?.ok ? <p className="text-sm font-bold text-green-800">Password set.</p> : null}
      </div>
    </form>
  );
}
