"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { needsInfoAction, sendQuoteAction, type AdminFormState } from "../../actions";

export function SendQuoteForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    sendQuoteAction.bind(null, requestId),
    null,
  );
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="All-in rate (USD)" htmlFor="allInRateUsd" error={err("allInRateUsd")}>
          <Input id="allInRateUsd" name="allInRateUsd" required inputMode="decimal" placeholder="1850.00" />
        </Field>
        <Field label="Valid until" htmlFor="validUntil" hint="Optional" error={err("validUntil")}>
          <Input id="validUntil" name="validUntil" type="date" />
        </Field>
      </div>
      <Field
        label="Service description"
        htmlFor="serviceDescription"
        hint="What the rate covers, in shipper language."
        error={err("serviceDescription")}
      >
        <Textarea
          id="serviceDescription"
          name="serviceDescription"
          required
          placeholder="Dry van 53', door to door, standard tracking updates, delivery by ..."
        />
      </Field>
      <Field
        label="Exclusions"
        htmlFor="exclusions"
        hint="Detention, lumper, TONU terms. Optional but recommended."
        error={err("exclusions")}
      >
        <Textarea id="exclusions" name="exclusions" placeholder="Detention after 2 hours at $75/hr; lumper fees billed at cost; ..." />
      </Field>
      {state?.formError ? <p className="text-sm font-bold text-red-700">{state.formError}</p> : null}
      {state?.ok ? <p className="text-sm font-bold text-green-800">Quote sent and shipper emailed.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send quote"}
      </Button>
    </form>
  );
}

export function NeedsInfoForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    needsInfoAction.bind(null, requestId),
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="What's missing?"
        htmlFor="message"
        hint="One consolidated ask for everything missing, not a drip of questions."
        error={state?.fieldErrors?.message?.[0]}
      >
        <Textarea
          id="message"
          name="message"
          required
          placeholder="Could you confirm the exact pickup address, facility hours, and whether a liftgate is needed at delivery?"
        />
      </Field>
      {state?.formError ? <p className="text-sm font-bold text-red-700">{state.formError}</p> : null}
      {state?.ok ? <p className="text-sm font-bold text-green-800">Marked needs-info and shipper emailed.</p> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Sending..." : "Ask for info"}
      </Button>
    </form>
  );
}
