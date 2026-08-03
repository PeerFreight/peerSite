"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { changeEmailAction, updateProfileAction, type SettingsFormState } from "./actions";
import { ValueRow } from "./value-row";

/* Each section shows the current value with one edit action; the form only
 * appears on demand and unmounts on cancel/success, which also clears any
 * stale action error for the next open. */

export function ProfileForm({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  if (editing) {
    return (
      <NameEditor
        name={name}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          setNotice("Saved.");
        }}
      />
    );
  }
  return (
    <ValueRow
      label="Name"
      value={name}
      notice={notice}
      actionLabel="Edit"
      onAction={() => {
        setNotice(null);
        setEditing(true);
      }}
    />
  );
}

function NameEditor({
  name,
  onCancel,
  onSaved,
}: {
  name: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateProfileAction,
    null,
  );
  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Name" htmlFor="profile-name" error={state?.error ?? undefined}>
        <Input
          id="profile-name"
          name="name"
          defaultValue={name}
          required
          maxLength={120}
          autoFocus
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="navy" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Save name"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Self-service email change: submits the new address, Better Auth mails it
 * a verification link, and nothing changes until that link is clicked. */
export function EmailForm({ email }: { email: string }) {
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  if (editing) {
    return (
      <EmailEditor
        onCancel={() => setEditing(false)}
        onSent={() => {
          setEditing(false);
          // Anti-enumeration: the API reports success even when the address
          // is taken, so this copy must stay conditional.
          setNotice("If that address is available, we sent it a verification link.");
        }}
      />
    );
  }
  return (
    <ValueRow
      label="Sign-in email"
      value={email}
      notice={notice}
      actionLabel="Change email"
      onAction={() => {
        setNotice(null);
        setEditing(true);
      }}
    />
  );
}

function EmailEditor({ onCancel, onSent }: { onCancel: () => void; onSent: () => void }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    changeEmailAction,
    null,
  );
  useEffect(() => {
    if (state?.ok) onSent();
  }, [state, onSent]);
  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="New email"
        htmlFor="new-email"
        hint="We will email the new address a verification link; your sign-in email changes when you click it."
        error={state?.error ?? undefined}
      >
        <Input
          id="new-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="navy" size="sm" disabled={pending}>
          {pending ? "Sending..." : "Send verification link"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
