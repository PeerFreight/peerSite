"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input, Select } from "@/components/ui/field";
import { cancelInvitationAction, inviteTeammateAction, type SettingsFormState } from "./actions";

/** Client bits of the Teammates section: the invite form and the pending-
 * invite cancel buttons. The member roster itself is server-rendered. */

export function InviteForm() {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    inviteTeammateAction,
    null,
  );
  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Field label="Invite by email" htmlFor="invite-email" error={state?.error ?? undefined}>
            <Input id="invite-email" name="email" type="email" required placeholder="teammate@company.com" />
          </Field>
        </div>
        <div className="w-36">
          <Field label="Role" htmlFor="invite-role">
            <Select id="invite-role" name="role" defaultValue="member">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
        </div>
        <Button type="submit" variant="navy" size="sm" className="mb-0.5" disabled={pending}>
          {pending ? "Sending..." : "Send invite"}
        </Button>
      </div>
      {state?.ok ? (
        <Alert tone="success">Invitation sent — it expires in 48 hours.</Alert>
      ) : null}
    </form>
  );
}

export function CancelInviteButton({ invitationId }: { invitationId: string }) {
  const [state, formAction] = useActionState<SettingsFormState, FormData>(
    cancelInvitationAction,
    null,
  );
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="invitationId" value={invitationId} />
      <ConfirmButton label="Cancel" variant="ghost" size="sm" />
      {state?.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
    </form>
  );
}
