"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { updateCompanyAction, type SettingsFormState } from "./actions";

export function CompanyForm({
  name,
  role,
  canEdit,
}: {
  name: string;
  role: string;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateCompanyAction,
    null,
  );
  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Company name"
        htmlFor="company-name"
        hint={
          canEdit
            ? `Your role: ${role}.`
            : `Your role: ${role}. Only an owner or admin can rename the company.`
        }
        error={state?.error ?? undefined}
      >
        <Input
          id="company-name"
          name="name"
          defaultValue={name}
          required
          maxLength={120}
          disabled={!canEdit}
        />
      </Field>
      {canEdit ? (
        <div className="flex items-center gap-3">
          <Button type="submit" variant="navy" size="sm" disabled={pending}>
            {pending ? "Saving..." : "Save company"}
          </Button>
          {state?.ok ? <p className="text-sm font-bold text-green-800">Saved.</p> : null}
        </div>
      ) : null}
    </form>
  );
}
