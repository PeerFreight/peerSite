"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { updateProfileAction, type SettingsFormState } from "./actions";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateProfileAction,
    null,
  );
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Name" htmlFor="profile-name" error={state?.error ?? undefined}>
        <Input id="profile-name" name="name" defaultValue={name} required maxLength={120} />
      </Field>
      <Field
        label="Email"
        htmlFor="profile-email"
        hint="To change your sign-in email, contact team@peer-freight.com."
      >
        <Input id="profile-email" value={email} disabled />
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
