"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { clearDelayAction, setDelayAction, type AdminFormState } from "../../actions";

/** Flag (or update) the load's delay; every set/clear emails the shipper. */
export function SetDelayForm({
  loadId,
  delayed,
  defaultReason,
  defaultRevised,
}: {
  loadId: string;
  delayed: boolean;
  defaultReason: string | null;
  defaultRevised: string | null;
}) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    setDelayAction.bind(null, loadId),
    null,
  );
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="What happened"
        htmlFor="reason"
        hint="In shipper language — this goes into the email and onto their timeline."
        error={err("reason")}
      >
        <Textarea
          id="reason"
          name="reason"
          required
          defaultValue={defaultReason ?? ""}
          placeholder="Tractor breakdown near Sacramento; replacement truck is dispatched."
        />
      </Field>
      <Field
        label="Revised delivery"
        htmlFor="revisedDeliveryDate"
        hint="Optional — leave blank if we don't have a new ETA yet."
        error={err("revisedDeliveryDate")}
      >
        <Input
          id="revisedDeliveryDate"
          name="revisedDeliveryDate"
          type="date"
          defaultValue={defaultRevised ?? ""}
        />
      </Field>
      {state?.formError ? <p className="text-sm font-bold text-red-700">{state.formError}</p> : null}
      {state?.ok ? (
        <p className="text-sm font-bold text-green-800">Delay flagged and shipper emailed.</p>
      ) : null}
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Flagging..." : delayed ? "Update delay" : "Flag delay"}
      </Button>
    </form>
  );
}

export function ClearDelayForm({ loadId }: { loadId: string }) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    clearDelayAction.bind(null, loadId),
    null,
  );

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Clearing..." : "Back on schedule"}
      </Button>
      {state?.formError ? <p className="text-sm font-bold text-red-700">{state.formError}</p> : null}
      {state?.ok ? (
        <p className="text-sm font-bold text-green-800">Cleared and shipper emailed.</p>
      ) : null}
    </form>
  );
}
