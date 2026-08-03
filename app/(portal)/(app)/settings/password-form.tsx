"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { changePasswordAction, setPasswordAction, type SettingsFormState } from "./actions";
import { ValueRow } from "./value-row";

/**
 * Set vs Change is decided server-side (hasCredentialAccount): magic-link
 * and social accounts have no password yet, so they get the set-a-password
 * form instead of a "current password" field they cannot fill. Either way
 * the section rests collapsed; the form opens on demand.
 */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const open = () => {
    setNotice(null);
    setEditing(true);
  };
  if (editing) {
    return hasPassword ? (
      <ChangePasswordForm
        onCancel={() => setEditing(false)}
        onDone={() => {
          setEditing(false);
          setNotice("Password changed. Your other devices were signed out.");
        }}
      />
    ) : (
      <SetPasswordForm
        onCancel={() => setEditing(false)}
        onDone={() => {
          setEditing(false);
          setNotice("Password set.");
        }}
      />
    );
  }
  return hasPassword ? (
    <ValueRow
      label="Password"
      value={"•".repeat(10)}
      notice={notice}
      hint="Changing it signs out your other devices."
      actionLabel="Change password"
      onAction={open}
    />
  ) : (
    <ValueRow
      label="Password"
      value="Not set"
      notice={notice}
      hint="You sign in with email links (or Google/Microsoft). Set a password to also sign in the classic way."
      actionLabel="Set password"
      onAction={open}
    />
  );
}

function ChangePasswordForm({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    changePasswordAction,
    null,
  );
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Current password" htmlFor="current-password">
        <PasswordInput
          id="current-password"
          name="currentPassword"
          autoComplete="current-password"
          required
          autoFocus
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
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function SetPasswordForm({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    setPasswordAction,
    null,
  );
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={formAction} className="space-y-4">
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
          autoFocus
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="navy" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Set password"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
