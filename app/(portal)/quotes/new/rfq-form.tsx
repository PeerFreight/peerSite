"use client";

import { useActionState, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  ACCESSORIAL_OPTIONS,
  EQUIPMENT_OPTIONS,
  FREQUENCY_OPTIONS,
  SCHEDULING_OPTIONS,
  rfqFromFormData,
  rfqSchema,
} from "@/lib/portal/rfq";
import { submitRfq, type RfqFormState } from "../actions";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="text-lg font-extrabold text-ink">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </Card>
  );
}

/** One stop's fields; identical shape for origin and destination. */
function StopFields({
  prefix,
  errors,
}: {
  prefix: "origin" | "dest";
  errors: Record<string, string[] | undefined>;
}) {
  const err = (name: string) => errors[name]?.[0];
  return (
    <>
      <Field label="Street address" htmlFor={`${prefix}Address`} hint="Optional for the estimate; needed before booking.">
        <Input id={`${prefix}Address`} name={`${prefix}Address`} autoComplete="off" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_5rem_8rem]">
        <Field label="City" htmlFor={`${prefix}City`} error={err(`${prefix}City`)}>
          <Input id={`${prefix}City`} name={`${prefix}City`} required />
        </Field>
        <Field label="State" htmlFor={`${prefix}State`} error={err(`${prefix}State`)}>
          <Input id={`${prefix}State`} name={`${prefix}State`} required maxLength={2} placeholder="CA" />
        </Field>
        <Field label="ZIP" htmlFor={`${prefix}Zip`} error={err(`${prefix}Zip`)}>
          <Input id={`${prefix}Zip`} name={`${prefix}Zip`} required inputMode="numeric" placeholder="94107" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Facility hours" htmlFor={`${prefix}Hours`} hint="e.g. 7am-3pm weekdays">
          <Input id={`${prefix}Hours`} name={`${prefix}Hours`} />
        </Field>
        <Field label="Scheduling" htmlFor={`${prefix}Scheduling`}>
          <Select id={`${prefix}Scheduling`} name={`${prefix}Scheduling`} defaultValue="fcfs">
            {SCHEDULING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
      </div>
    </>
  );
}

export function RfqForm() {
  const [state, formAction, pending] = useActionState<RfqFormState, FormData>(submitRfq, null);
  const [clientErrors, setClientErrors] = useState<Record<string, string[] | undefined>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [equipment, setEquipment] = useState("dry_van_53");
  const [hazmat, setHazmat] = useState(false);

  // Server errors win when present (they are the same schema, re-run).
  const errors = state?.fieldErrors ?? clientErrors;
  const formError = state?.formError ?? clientFormError;
  const err = (name: string) => errors[name]?.[0];

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const parsed = rfqSchema.safeParse(rfqFromFormData(new FormData(e.currentTarget)));
    if (!parsed.success) {
      e.preventDefault();
      setClientErrors(z.flattenError(parsed.error).fieldErrors);
      setClientFormError("Fix the highlighted fields and resubmit.");
      return;
    }
    setClientErrors({});
    setClientFormError(null);
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-6" noValidate>
      <Section title="Lane">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-muted">Pickup</h3>
            <StopFields prefix="origin" errors={errors} />
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-muted">Delivery</h3>
            <StopFields prefix="dest" errors={errors} />
          </div>
        </div>
      </Section>

      <Section title="Schedule">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pickup date" htmlFor="pickupDate" error={err("pickupDate")}>
            <Input id="pickupDate" name="pickupDate" type="date" required />
          </Field>
          <Field label="Pickup window" htmlFor="pickupWindow" hint="e.g. 8am-12pm">
            <Input id="pickupWindow" name="pickupWindow" />
          </Field>
          <Field label="Delivery date" htmlFor="deliveryDate" error={err("deliveryDate")}>
            <Input id="deliveryDate" name="deliveryDate" type="date" required />
          </Field>
          <Field label="Delivery window" htmlFor="deliveryWindow" hint="e.g. by 3pm">
            <Input id="deliveryWindow" name="deliveryWindow" />
          </Field>
        </div>
        <Field label="Date flexibility" htmlFor="dateFlexibility">
          <Select id="dateFlexibility" name="dateFlexibility" defaultValue="exact">
            <option value="exact">Dates are firm</option>
            <option value="flexible">Dates are flexible</option>
          </Select>
        </Field>
      </Section>

      <Section title="Freight">
        <Field
          label="Commodity"
          htmlFor="commodity"
          hint="Be exact, e.g. packaged beer, cases on pallets."
          error={err("commodity")}
        >
          <Input id="commodity" name="commodity" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Total weight (lbs)" htmlFor="weightLbs" error={err("weightLbs")}>
            <Input id="weightLbs" name="weightLbs" required inputMode="numeric" placeholder="38000" />
          </Field>
          <Field label="Pieces / pallets" htmlFor="pieces" error={err("pieces")}>
            <Input id="pieces" name="pieces" required placeholder="26 pallets" />
          </Field>
          <Field label="Dimensions" htmlFor="dims" hint="If oversize or odd">
            <Input id="dims" name="dims" placeholder={'48x40x60" per pallet'} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Equipment" htmlFor="equipment">
            <Select
              id="equipment"
              name="equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
            >
              {EQUIPMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Declared cargo value (USD)"
            htmlFor="declaredValueUsd"
            hint="Sets the carrier cargo-insurance minimum."
            error={err("declaredValueUsd")}
          >
            <Input id="declaredValueUsd" name="declaredValueUsd" inputMode="decimal" placeholder="45000" />
          </Field>
        </div>
        {equipment === "reefer" ? (
          <Field label="Temperature set point (F)" htmlFor="temperatureF" error={err("temperatureF")}>
            <Input id="temperatureF" name="temperatureF" placeholder="38" />
          </Field>
        ) : null}
        {equipment === "other" ? (
          <Field label="Equipment details" htmlFor="equipmentNotes" error={err("equipmentNotes")}>
            <Input id="equipmentNotes" name="equipmentNotes" placeholder="e.g. step deck, 26' box truck" />
          </Field>
        ) : null}
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm font-bold text-ink">
            <input
              type="checkbox"
              name="hazmat"
              checked={hazmat}
              onChange={(e) => setHazmat(e.target.checked)}
              className="mt-0.5"
            />
            Any of this freight is hazardous material
          </label>
          {hazmat ? (
            <>
              <Field label="Hazmat details" htmlFor="hazmatDetails" error={err("hazmatDetails")}>
                <Textarea
                  id="hazmatDetails"
                  name="hazmatDetails"
                  placeholder="UN number, hazard class, packing group, description"
                />
              </Field>
              <p className="rounded-lg bg-gold/15 px-3 py-2 text-sm text-ink">
                Hazmat moves get a manual review before we quote. We will come
                back to you quickly with any questions.
              </p>
            </>
          ) : null}
        </div>
      </Section>

      <Section title="Services">
        <fieldset>
          <legend className="text-sm font-bold text-ink">Special services at pickup or delivery</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ACCESSORIAL_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="accessorials" value={o.value} />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section title="References & rate">
        <div className="space-y-2">
          <p className="text-sm font-bold text-ink">Reference numbers</p>
          <p className="text-sm text-muted">PO, BOL, or pickup numbers your receiver requires.</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr]">
              <Input name={`refLabel${i}`} placeholder="PO #" aria-label={`Reference ${i + 1} label`} />
              <Input name={`refValue${i}`} placeholder="Value" aria-label={`Reference ${i + 1} value`} />
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Target rate (USD, optional)"
            htmlFor="targetRateUsd"
            hint="If you have a budget in mind, it helps us respond faster."
            error={err("targetRateUsd")}
          >
            <Input id="targetRateUsd" name="targetRateUsd" inputMode="decimal" placeholder="1850" />
          </Field>
          <Field label="How often does this ship?" htmlFor="frequency">
            <Select id="frequency" name="frequency" defaultValue="one_time">
              {FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Anything else we should know?" htmlFor="notes">
          <Textarea id="notes" name="notes" placeholder="Access constraints, stackability, seal requirements, ..." />
        </Field>
      </Section>

      {formError ? <p className="text-sm font-bold text-red-700">{formError}</p> : null}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting..." : "Submit quote request"}
        </Button>
        <p className="text-sm text-muted">One of the owners gets back to you within the hour.</p>
      </div>
    </form>
  );
}
