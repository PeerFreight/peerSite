"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createInvoiceAction, markInvoicePaidAction, type AdminFormState } from "../../actions";

/** Issue the load's invoice. A delivered load moves to invoiced in the same
 * transaction; the shipper gets the invoice email (not the status one). */
export function CreateInvoiceForm({
  loadId,
  defaultAmount,
}: {
  loadId: string;
  defaultAmount: string;
}) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    createInvoiceAction.bind(null, loadId),
    null,
  );
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Amount (USD)"
          htmlFor="amountUsd"
          hint="Blank = the agreed all-in rate."
          error={err("amountUsd")}
        >
          <Input id="amountUsd" name="amountUsd" inputMode="decimal" placeholder={defaultAmount} />
        </Field>
        <Field label="Due date" htmlFor="dueDate" error={err("dueDate")}>
          <Input id="dueDate" name="dueDate" type="date" required />
        </Field>
      </div>
      {state?.formError ? <p className="text-sm font-bold text-red-700">{state.formError}</p> : null}
      {state?.ok ? (
        <p className="text-sm font-bold text-green-800">Invoice issued and shipper emailed.</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Issuing..." : "Issue invoice"}
      </Button>
    </form>
  );
}

export function MarkPaidForm({ invoiceId, loadId }: { invoiceId: string; loadId: string }) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    markInvoicePaidAction.bind(null, invoiceId, loadId),
    null,
  );

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Recording..." : "Mark paid"}
      </Button>
      {state?.formError ? <p className="text-sm font-bold text-red-700">{state.formError}</p> : null}
    </form>
  );
}
