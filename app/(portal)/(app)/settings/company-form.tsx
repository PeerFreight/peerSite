"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { updateCompanyAction, type SettingsFormState } from "./actions";
import { ValueRow } from "./value-row";

export function CompanyForm({
  name,
  role,
  canEdit,
}: {
  name: string;
  role: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  if (editing) {
    return (
      <CompanyEditor
        name={name}
        role={role}
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
      label="Company name"
      value={name}
      notice={notice}
      hint={
        canEdit
          ? `Your role: ${role}.`
          : `Your role: ${role}. Only an owner or admin can rename the company.`
      }
      actionLabel={canEdit ? "Edit" : undefined}
      onAction={
        canEdit
          ? () => {
              setNotice(null);
              setEditing(true);
            }
          : undefined
      }
    />
  );
}

function CompanyEditor({
  name,
  role,
  onCancel,
  onSaved,
}: {
  name: string;
  role: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateCompanyAction,
    null,
  );
  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);
  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Company name"
        htmlFor="company-name"
        hint={`Your role: ${role}.`}
        error={state?.error ?? undefined}
      >
        <Input
          id="company-name"
          name="name"
          defaultValue={name}
          required
          maxLength={120}
          autoFocus
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="navy" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Save company"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
