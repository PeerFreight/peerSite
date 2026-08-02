"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { changeEmailAction, updateProfileAction, type SettingsFormState } from "./actions";

export function ProfileForm({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateProfileAction,
    null,
  );
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Name" htmlFor="profile-name" error={state?.error ?? undefined}>
        <Input id="profile-name" name="name" defaultValue={name} required maxLength={120} />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="navy" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </Button>
        {state?.ok ? <p className="text-sm font-bold text-green-800">Saved.</p> : null}
      </div>
    </form>
  );
}

/** Self-service email change: submits the new address, Better Auth mails it
 * a verification link, and nothing changes until that link is clicked. */
export function EmailForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    changeEmailAction,
    null,
  );
  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted">
        You sign in as <span className="font-bold text-ink">{email}</span>.
      </p>
      <Field
        label="New email"
        htmlFor="new-email"
        hint="We will email the new address a verification link; your sign-in email changes when you click it."
        error={state?.error ?? undefined}
      >
        <Input id="new-email" name="email" type="email" autoComplete="email" required />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="navy" size="sm" disabled={pending}>
          {pending ? "Sending..." : "Change email"}
        </Button>
        {state?.ok ? (
          // Anti-enumeration: the API reports success even when the address
          // is taken, so this copy must stay conditional.
          <p className="text-sm font-bold text-green-800">
            If that address is available, we sent it a verification link.
          </p>
        ) : null}
      </div>
    </form>
  );
}
