"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { JoinedGrid } from "@/components/ui/panel";
import { DateField } from "@/components/ui/date-field";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { IconCheck } from "@/components/ui/icons";
import {
  ACCESSORIAL_OPTIONS,
  EQUIPMENT_GROUPS,
  EQUIPMENT_NEEDS_NOTES,
  FREQUENCY_OPTIONS,
  SCHEDULING_OPTIONS,
  STEP_FIELDS,
  rfqFromFormData,
  rfqSchema,
  type RfqFormState,
  type RfqInput,
} from "@/lib/portal/rfq";
import { saveRfqDraft } from "./draft";
import { HazmatFields } from "./hazmat-fields";
import { ReviewStep } from "./review-step";

/** Values used to seed the form when duplicating a previous request or
 * restoring a localStorage draft. Duplicate-previous never sets the dates
 * (they don't carry over to a new shipment); a draft restore does. */
export type RfqPrefill = {
  originAddress?: string | null;
  originCity?: string;
  originState?: string;
  originZip?: string;
  originHours?: string | null;
  originScheduling?: string;
  destAddress?: string | null;
  destCity?: string;
  destState?: string;
  destZip?: string;
  destHours?: string | null;
  destScheduling?: string;
  pickupDate?: string | null;
  pickupWindow?: string | null;
  deliveryDate?: string | null;
  deliveryWindow?: string | null;
  dateFlexibility?: string;
  commodity?: string;
  weightLbs?: number | string;
  pieces?: string;
  dims?: string | null;
  declaredValueUsd?: string | null;
  equipment?: string;
  temperatureF?: string | null;
  equipmentNotes?: string | null;
  hazmat?: boolean;
  hazmatUnNumber?: string | null;
  hazmatShippingName?: string | null;
  hazmatClass?: string | null;
  hazmatPackingGroup?: string | null;
  hazmatQuantity?: string | null;
  hazmatPlacardsRequired?: string | null;
  hazmatEmergencyContact?: string | null;
  hazmatTechnicalName?: string | null;
  hazmatDetails?: string | null;
  accessorials?: string[];
  referenceNumbers?: { label: string; value: string }[];
  targetRateUsd?: string | null;
  frequency?: string;
  notes?: string | null;
};

const STEPS = [
  { n: 1, label: "Lane & dates" },
  { n: 2, label: "Freight" },
  { n: 3, label: "Services & extras" },
  { n: 4, label: "Review & submit" },
] as const;

export type FieldErrors = Record<string, string[] | undefined>;

/** Render prop for the guest funnel's account step, shown on Review &
 * submit. Gets the live field errors (server errors land here merged with
 * the RFQ's), the raw action state (for `accountExists`), and the submit
 * pending flag. */
export type RfqAccountSection = (ctx: {
  errors: FieldErrors;
  state: RfqFormState;
  pending: boolean;
}) => React.ReactNode;

export type RfqFormProps = {
  prefill?: RfqPrefill;
  /** Server action the form posts to; portal and guest pages differ here. */
  action: (prev: RfqFormState, formData: FormData) => Promise<RfqFormState>;
  submitLabel?: string;
  accountSection?: RfqAccountSection;
  /** Save a localStorage draft on every step advance, so redirects away
   * from the page (magic link, OAuth) can restore the answers. */
  persistDraft?: boolean;
};

function stepErrors(all: FieldErrors, step: number): FieldErrors {
  const fields = STEP_FIELDS[step] ?? [];
  return Object.fromEntries(
    Object.entries(all).filter(([k, v]) => v?.length && (fields as readonly string[]).includes(k)),
  );
}

function firstErrorStep(all: FieldErrors): number | null {
  for (const step of [1, 2, 3]) {
    if (Object.keys(stepErrors(all, step)).length > 0) return step;
  }
  return null;
}

function Stepper({
  step,
  erred,
  onBack,
}: {
  step: number;
  erred: Set<number>;
  onBack: (n: number) => void;
}) {
  return (
    <>
      {/* Desktop: the four stations. Only visited steps are clickable. */}
      <ol className="hidden items-center gap-2 sm:flex" aria-label="Form steps">
        {STEPS.map((s, i) => {
          const done = s.n < step;
          const current = s.n === step;
          return (
            <li key={s.n} className="flex items-center gap-2">
              {i > 0 ? <span aria-hidden className="h-px w-6 bg-line" /> : null}
              <button
                type="button"
                disabled={!done}
                onClick={() => onBack(s.n)}
                aria-current={current ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-bold ${
                  done ? "text-ink hover:bg-white" : current ? "text-ink" : "text-muted"
                }`}
              >
                <span
                  className={`relative flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                    done
                      ? "bg-gold text-navy"
                      : current
                        ? "bg-navy text-white"
                        : "bg-white text-muted"
                  }`}
                >
                  {done ? <IconCheck size={13} /> : s.n}
                  {erred.has(s.n) && !current ? (
                    <span
                      aria-hidden
                      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-600"
                    />
                  ) : null}
                </span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>
      {/* Mobile: step counter + thin gold progress bar. */}
      <div className="sm:hidden">
        <p className="text-sm font-bold text-ink">
          Step {step} of {STEPS.length}
          <span className="ml-2 font-bold text-muted">{STEPS[step - 1].label}</span>
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </>
  );
}

/** One stop's fields; identical shape for origin and destination. Address,
 * hours, and scheduling hide behind a disclosure — most quotes don't need
 * them yet. */
function StopFields({
  prefix,
  errors,
  prefill,
}: {
  prefix: "origin" | "dest";
  errors: FieldErrors;
  prefill?: RfqPrefill;
}) {
  const err = (name: string) => errors[name]?.[0];
  const p = <K extends keyof RfqPrefill>(key: K) => prefill?.[key];
  const address = p(`${prefix}Address` as keyof RfqPrefill) as string | null | undefined;
  const hours = p(`${prefix}Hours` as keyof RfqPrefill) as string | null | undefined;
  const scheduling = p(`${prefix}Scheduling` as keyof RfqPrefill) as string | undefined;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_5rem_8rem]">
        <Field label="City" htmlFor={`${prefix}City`} error={err(`${prefix}City`)}>
          <Input
            id={`${prefix}City`}
            name={`${prefix}City`}
            defaultValue={(p(`${prefix}City` as keyof RfqPrefill) as string) ?? ""}
            aria-invalid={err(`${prefix}City`) ? true : undefined}
          />
        </Field>
        <Field label="State" htmlFor={`${prefix}State`} error={err(`${prefix}State`)}>
          <Input
            id={`${prefix}State`}
            name={`${prefix}State`}
            maxLength={2}
            placeholder="CA"
            defaultValue={(p(`${prefix}State` as keyof RfqPrefill) as string) ?? ""}
            aria-invalid={err(`${prefix}State`) ? true : undefined}
          />
        </Field>
        <Field label="ZIP" htmlFor={`${prefix}Zip`} error={err(`${prefix}Zip`)}>
          <Input
            id={`${prefix}Zip`}
            name={`${prefix}Zip`}
            inputMode="numeric"
            placeholder="94107"
            defaultValue={(p(`${prefix}Zip` as keyof RfqPrefill) as string) ?? ""}
            aria-invalid={err(`${prefix}Zip`) ? true : undefined}
          />
        </Field>
      </div>
      <details open={Boolean(address || hours || (scheduling && scheduling !== "fcfs"))}>
        <summary className="cursor-pointer text-sm font-bold text-navy hover:underline">
          Add facility details
        </summary>
        <div className="mt-3 space-y-4">
          <Field
            label="Street address"
            htmlFor={`${prefix}Address`}
            optional
            hint="Optional for the estimate; needed before booking."
          >
            <Input
              id={`${prefix}Address`}
              name={`${prefix}Address`}
              autoComplete="off"
              defaultValue={address ?? ""}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Facility hours" htmlFor={`${prefix}Hours`} optional hint="e.g. 7am-3pm weekdays">
              <Input id={`${prefix}Hours`} name={`${prefix}Hours`} defaultValue={hours ?? ""} />
            </Field>
            <Field label="Scheduling" htmlFor={`${prefix}Scheduling`}>
              <Select
                id={`${prefix}Scheduling`}
                name={`${prefix}Scheduling`}
                defaultValue={scheduling ?? "fcfs"}
              >
                {SCHEDULING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </details>
    </>
  );
}

export function RfqForm({
  prefill,
  action,
  submitLabel = "Submit quote request",
  accountSection,
  persistDraft,
}: RfqFormProps) {
  const [state, formAction, pending] = useActionState<RfqFormState, FormData>(action, null);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [erredSteps, setErredSteps] = useState<Set<number>>(new Set());
  const [equipment, setEquipment] = useState(prefill?.equipment ?? "dry_van_53");
  const [hazmat, setHazmat] = useState(prefill?.hazmat ?? false);
  const [pickupIso, setPickupIso] = useState<string | null>(prefill?.pickupDate ?? null);
  const [review, setReview] = useState<RfqInput | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [focusField, setFocusField] = useState<string | null>(null);

  const err = (name: string) => errors[name]?.[0];

  // Server errors (same schema, re-run) land like a failed client submit:
  // show them and jump to the first step that has one.
  useEffect(() => {
    if (state?.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
      showErrors(state.fieldErrors, state.formError);
    } else if (state?.formError) {
      setFormError(state.formError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (!focusField) return;
    document.getElementById(focusField)?.focus();
    setFocusField(null);
  }, [focusField, step]);

  function goTo(n: number) {
    setStep(n);
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }),
    );
  }

  function showErrors(all: FieldErrors, message?: string | null) {
    setErrors(all);
    setFormError(message ?? "Fix the highlighted fields.");
    setErredSteps(new Set([1, 2, 3].filter((n) => Object.keys(stepErrors(all, n)).length > 0)));
    const target = firstErrorStep(all);
    if (target) {
      goTo(target);
      const firstField = Object.keys(stepErrors(all, target))[0];
      if (firstField) setFocusField(firstField);
    }
  }

  function parseForm() {
    return rfqSchema.safeParse(rfqFromFormData(new FormData(formRef.current!)));
  }

  function goNext() {
    // Whatever is filled so far survives a redirect away from the page.
    if (persistDraft) {
      saveRfqDraft(rfqFromFormData(new FormData(formRef.current!)) as RfqPrefill);
    }
    const parsed = parseForm();
    if (parsed.success) {
      setErrors({});
      setFormError(null);
      setErredSteps(new Set());
      if (step === 3) setReview(parsed.data);
      goTo(step + 1);
      return;
    }
    const all = z.flattenError(parsed.error).fieldErrors as FieldErrors;
    const mine = stepErrors(all, step);
    if (Object.keys(mine).length > 0) {
      // This step is broken: surface only its errors and stay.
      setErrors(mine);
      setFormError("Fix the highlighted fields to continue.");
      setErredSteps((prev) => new Set(prev).add(step));
      const firstField = Object.keys(mine)[0];
      if (firstField) setFocusField(firstField);
      return;
    }
    if (step < 3) {
      // Errors live on a later step; this one is clean — move on.
      setErrors({});
      setFormError(null);
      goTo(step + 1);
      return;
    }
    // Entering Review requires the whole form to parse; jump to the break.
    showErrors(all);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const parsed = rfqSchema.safeParse(rfqFromFormData(new FormData(e.currentTarget)));
    if (!parsed.success) {
      e.preventDefault();
      showErrors(
        z.flattenError(parsed.error).fieldErrors as FieldErrors,
        "Fix the highlighted fields and resubmit.",
      );
      return;
    }
    setErrors({});
    setFormError(null);
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="scroll-mt-6 space-y-6">
      <Stepper step={step} erred={erredSteps} onBack={(n) => n < step && goTo(n)} />

      {/* Step 1 — Lane & dates: one attached surface, sections at hairline joints. */}
      <div hidden={step !== 1}>
        <JoinedGrid>
          <div className="bg-white p-6">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <h2 className="section-label">Pickup</h2>
                <StopFields prefix="origin" errors={errors} prefill={prefill} />
              </div>
              <div className="space-y-4">
                <h2 className="section-label">Delivery</h2>
                <StopFields prefix="dest" errors={errors} prefill={prefill} />
              </div>
            </div>
          </div>
          <div className="bg-white p-6">
          <h2 className="section-label">Dates</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Pickup date" htmlFor="pickupDate" error={err("pickupDate")}>
              <DateField
                id="pickupDate"
                name="pickupDate"
                defaultValue={prefill?.pickupDate ?? undefined}
                invalid={Boolean(err("pickupDate"))}
                onValueChange={setPickupIso}
              />
            </Field>
            <Field label="Pickup window" htmlFor="pickupWindow" optional hint="e.g. 8am-12pm">
              <Input
                id="pickupWindow"
                name="pickupWindow"
                defaultValue={prefill?.pickupWindow ?? ""}
              />
            </Field>
            <Field label="Delivery date" htmlFor="deliveryDate" error={err("deliveryDate")}>
              <DateField
                id="deliveryDate"
                name="deliveryDate"
                defaultValue={prefill?.deliveryDate ?? undefined}
                min={pickupIso ?? undefined}
                invalid={Boolean(err("deliveryDate"))}
              />
            </Field>
            <Field label="Delivery window" htmlFor="deliveryWindow" optional hint="e.g. by 3pm">
              <Input
                id="deliveryWindow"
                name="deliveryWindow"
                defaultValue={prefill?.deliveryWindow ?? ""}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Date flexibility" htmlFor="dateFlexibility">
              <Select
                id="dateFlexibility"
                name="dateFlexibility"
                defaultValue={prefill?.dateFlexibility ?? "exact"}
              >
                <option value="exact">Dates are firm</option>
                <option value="flexible">Dates are flexible</option>
              </Select>
            </Field>
          </div>
          </div>
        </JoinedGrid>
      </div>

      {/* Step 2 — Freight */}
      <div hidden={step !== 2} className="space-y-6">
        <Card className="space-y-4">
          <Field
            label="Commodity"
            htmlFor="commodity"
            hint="Be exact, e.g. packaged beer, cases on pallets."
            error={err("commodity")}
          >
            <Input
              id="commodity"
              name="commodity"
              defaultValue={prefill?.commodity ?? ""}
              aria-invalid={err("commodity") ? true : undefined}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Total weight (lbs)" htmlFor="weightLbs" error={err("weightLbs")}>
              <Input
                id="weightLbs"
                name="weightLbs"
                inputMode="numeric"
                placeholder="38000"
                defaultValue={prefill?.weightLbs ?? ""}
                aria-invalid={err("weightLbs") ? true : undefined}
              />
            </Field>
            <Field label="Pieces / pallets" htmlFor="pieces" error={err("pieces")}>
              <Input
                id="pieces"
                name="pieces"
                placeholder="26 pallets"
                defaultValue={prefill?.pieces ?? ""}
                aria-invalid={err("pieces") ? true : undefined}
              />
            </Field>
            <Field label="Dimensions" htmlFor="dims" optional hint="If oversize or odd">
              <Input
                id="dims"
                name="dims"
                placeholder={'48x40x60" per pallet'}
                defaultValue={prefill?.dims ?? ""}
              />
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
                {EQUIPMENT_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field
              label="Declared cargo value (USD)"
              htmlFor="declaredValueUsd"
              optional
              hint="Sets the carrier cargo-insurance minimum."
              error={err("declaredValueUsd")}
            >
              <Input
                id="declaredValueUsd"
                name="declaredValueUsd"
                inputMode="decimal"
                placeholder="45000"
                defaultValue={prefill?.declaredValueUsd ?? ""}
              />
            </Field>
          </div>
          {equipment === "reefer" ? (
            <Field label="Temperature set point (F)" htmlFor="temperatureF" error={err("temperatureF")}>
              <Input
                id="temperatureF"
                name="temperatureF"
                placeholder="38"
                defaultValue={prefill?.temperatureF ?? ""}
                aria-invalid={err("temperatureF") ? true : undefined}
              />
            </Field>
          ) : null}
          {EQUIPMENT_NEEDS_NOTES.includes(equipment) ? (
            <Field
              label="Equipment details"
              htmlFor="equipmentNotes"
              hint={
                equipment === "ltl_partial"
                  ? "Linear feet or pallet spots, stackability, and any transit-time constraints."
                  : undefined
              }
              error={err("equipmentNotes")}
            >
              <Input
                id="equipmentNotes"
                name="equipmentNotes"
                placeholder="e.g. 26' box truck with liftgate"
                defaultValue={prefill?.equipmentNotes ?? ""}
              />
            </Field>
          ) : null}
          <div className="space-y-3">
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
            {hazmat ? <HazmatFields errors={errors} prefill={prefill} /> : null}
          </div>
        </Card>
      </div>

      {/* Step 3 — Services & extras */}
      <div hidden={step !== 3} className="space-y-6">
        <Card className="space-y-5">
          <p className="text-sm font-bold text-muted">
            All optional — skip anything that doesn't apply.
          </p>
          <fieldset>
            <legend className="text-sm font-bold text-ink">
              Special services at pickup or delivery
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {ACCESSORIAL_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    name="accessorials"
                    value={o.value}
                    defaultChecked={prefill?.accessorials?.includes(o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <p className="text-sm font-bold text-ink">Reference numbers</p>
            <p className="text-sm text-muted">PO, BOL, or pickup numbers your receiver requires.</p>
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                <Input
                  name={`refLabel${i}`}
                  placeholder="PO #"
                  aria-label={`Reference ${i + 1} label`}
                  defaultValue={prefill?.referenceNumbers?.[i]?.label ?? ""}
                />
                <Input
                  name={`refValue${i}`}
                  placeholder="Value"
                  aria-label={`Reference ${i + 1} value`}
                  defaultValue={prefill?.referenceNumbers?.[i]?.value ?? ""}
                />
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Target rate (USD)"
              htmlFor="targetRateUsd"
              optional
              hint="If you have a budget in mind, it helps us respond faster."
              error={err("targetRateUsd")}
            >
              <Input
                id="targetRateUsd"
                name="targetRateUsd"
                inputMode="decimal"
                placeholder="1850"
                defaultValue={prefill?.targetRateUsd ?? ""}
              />
            </Field>
            <Field label="How often does this ship?" htmlFor="frequency">
              <Select id="frequency" name="frequency" defaultValue={prefill?.frequency ?? "one_time"}>
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Anything else we should know?" htmlFor="notes" optional>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Access constraints, stackability, seal requirements, ..."
              defaultValue={prefill?.notes ?? ""}
            />
          </Field>
        </Card>
      </div>

      {/* Step 4 — Review & submit */}
      <div hidden={step !== 4} className="space-y-6">
        <Card>{review ? <ReviewStep data={review} onEdit={goTo} /> : null}</Card>
        {accountSection ? accountSection({ errors, state, pending }) : null}
      </div>

      {formError ? (
        <p role="alert" className="text-sm font-bold text-red-700">
          {formError}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-1 border-t border-line bg-paper px-1 py-3">
        <div className="flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button variant="secondary" onClick={() => goTo(step - 1)}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < 4 ? (
            <Button variant="navy" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-4">
              <p className="text-sm text-muted">One of the owners gets back to you within the hour.</p>
              <Button type="submit" disabled={pending}>
                {pending ? "Submitting..." : submitLabel}
              </Button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
