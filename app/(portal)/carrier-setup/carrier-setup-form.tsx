"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { IconCheck } from "@/components/ui/icons";
import { JoinedGrid } from "@/components/ui/panel";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { submitCarrierSetup, type CarrierSetupFormState } from "./actions";

/**
 * The carrier setup form on portal primitives: one page, two attached
 * sections (company, operation) at a hairline joint. Field names and values
 * are unchanged — actions.ts still posts to team@peer-freight.com via
 * Resend with the same honeypot and per-IP throttle. The factoring-name
 * field only mounts for factoring payment; hidden means absent from
 * FormData, which the schema already treats as "".
 */

const EQUIPMENT_OPTIONS = [
  "Dry van",
  "Reefer",
  "Flatbed",
  "Tanker",
  "Drayage",
  "Specialized",
];

export function CarrierSetupForm() {
  const [state, formAction, pending] = useActionState<CarrierSetupFormState, FormData>(
    submitCarrierSetup,
    null,
  );
  const [payment, setPayment] = useState("Direct deposit");

  if (state?.sent) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-navy">
          <IconCheck size={22} />
        </span>
        <h2 className="text-lg font-extrabold text-ink">Request received</h2>
        <p className="max-w-md text-sm text-muted">
          Your setup request is in our inbox. We will verify your authority and
          reply with the rest of the packet, usually the same day.
        </p>
        <LinkButton variant="navy" href="/carriers" className="mt-2">
          Back to carriers
        </LinkButton>
      </Card>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Honeypot: humans never see it; bots that fill it get a fake success. */}
      <input
        type="text"
        name="website"
        style={{ display: "none" }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <JoinedGrid>
        <div className="space-y-4 bg-white p-6">
          <h2 className="section-label">Your company</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company (legal name)" htmlFor="company">
              <Input id="company" name="company" autoComplete="organization" required />
            </Field>
            <Field label="Your name" htmlFor="name">
              <Input id="name" name="name" autoComplete="name" required />
            </Field>
            <Field label="MC number" htmlFor="mc">
              <Input id="mc" name="mc_number" inputMode="numeric" placeholder="e.g. MC 123456" required />
            </Field>
            <Field label="USDOT number" htmlFor="dot">
              <Input id="dot" name="usdot_number" inputMode="numeric" placeholder="e.g. 1234567" required />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" type="tel" autoComplete="tel" required />
            </Field>
          </div>
          <Field label="Home base (city, state)" htmlFor="base">
            <Input id="base" name="home_base" placeholder="e.g. Fresno, CA" required />
          </Field>
        </div>

        <div className="space-y-4 bg-white p-6">
          <h2 className="section-label">Your operation</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Number of trucks" htmlFor="trucks">
              <Input id="trucks" name="truck_count" inputMode="numeric" placeholder="e.g. 3" required />
            </Field>
          </div>
          <fieldset>
            <legend className="text-sm font-bold text-ink">Equipment you run</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {EQUIPMENT_OPTIONS.map((label) => (
                <label key={label} className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="equipment" value={label} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hazmat certified drivers?">
              <SegmentedControl
                name="hazmat"
                ariaLabel="Hazmat certified drivers?"
                defaultValue="No"
                options={[
                  { value: "No", label: "No" },
                  { value: "Yes", label: "Yes" },
                ]}
              />
            </Field>
            <Field label="Preferred lanes or regions" htmlFor="lanes" optional>
              <Input id="lanes" name="lanes" placeholder="e.g. CA to NV, West Coast" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="How do you want to get paid?">
              <SegmentedControl
                name="payment"
                ariaLabel="How do you want to get paid?"
                defaultValue="Direct deposit"
                onValueChange={setPayment}
                options={[
                  { value: "Direct deposit", label: "Direct deposit" },
                  { value: "Factoring company", label: "Factoring company" },
                ]}
              />
            </Field>
            {payment === "Factoring company" ? (
              <Field label="Factoring company name" htmlFor="factor">
                <Input id="factor" name="factoring_company" placeholder="e.g. OTR Solutions" />
              </Field>
            ) : null}
          </div>
          <Field label="Anything else we should know?" htmlFor="notes" optional>
            <Textarea id="notes" name="notes" placeholder="Endorsements, trailer specs, teams…" />
          </Field>
        </div>
      </JoinedGrid>

      {state?.formError ? <Alert tone="error">{state.formError}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-md text-sm text-muted">
          Goes straight to the owners. We never ask for banking details over a
          web form; those come with the packet.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
      </div>
    </form>
  );
}
