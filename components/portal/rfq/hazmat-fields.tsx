"use client";

import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  HAZMAT_CLASS_OPTIONS,
  HAZMAT_PACKING_GROUP_OPTIONS,
  HAZMAT_PLACARD_OPTIONS,
} from "@/lib/portal/rfq";
import type { RfqPrefill } from "./rfq-form";

/**
 * Structured hazmat panel inside the Freight step. UN number, shipping
 * name, and class gate the quote (pricing needs them); everything else is
 * shipping-paper detail collected up front so booking never stalls on it.
 */
export function HazmatFields({
  errors,
  prefill,
}: {
  errors: Record<string, string[] | undefined>;
  prefill?: RfqPrefill;
}) {
  const err = (name: string) => errors[name]?.[0];
  return (
    <div className="space-y-4 rounded-lg border border-line bg-paper p-4">
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="UN number" htmlFor="hazmatUnNumber" error={err("hazmatUnNumber")}>
          <Input
            id="hazmatUnNumber"
            name="hazmatUnNumber"
            placeholder="UN1993"
            defaultValue={prefill?.hazmatUnNumber ?? ""}
            aria-invalid={err("hazmatUnNumber") ? true : undefined}
          />
        </Field>
        <Field
          label="Proper shipping name"
          htmlFor="hazmatShippingName"
          hint="As it appears on the SDS, e.g. Flammable liquids, n.o.s."
          error={err("hazmatShippingName")}
        >
          <Input
            id="hazmatShippingName"
            name="hazmatShippingName"
            defaultValue={prefill?.hazmatShippingName ?? ""}
            aria-invalid={err("hazmatShippingName") ? true : undefined}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hazard class" htmlFor="hazmatClass" error={err("hazmatClass")}>
          <Select
            id="hazmatClass"
            name="hazmatClass"
            defaultValue={prefill?.hazmatClass ?? ""}
            aria-invalid={err("hazmatClass") ? true : undefined}
          >
            <option value="">Choose a class…</option>
            {HAZMAT_CLASS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Packing group" htmlFor="hazmatPackingGroup" optional>
          <Select
            id="hazmatPackingGroup"
            name="hazmatPackingGroup"
            defaultValue={prefill?.hazmatPackingGroup ?? ""}
          >
            <option value="">Not sure</option>
            {HAZMAT_PACKING_GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Hazmat quantity"
          htmlFor="hazmatQuantity"
          optional
          hint="e.g. 4 x 275-gal totes"
        >
          <Input
            id="hazmatQuantity"
            name="hazmatQuantity"
            defaultValue={prefill?.hazmatQuantity ?? ""}
          />
        </Field>
        <Field label="Placards required?" optional>
          <SegmentedControl
            name="hazmatPlacardsRequired"
            ariaLabel="Placards required?"
            defaultValue={prefill?.hazmatPlacardsRequired ?? "unknown"}
            options={HAZMAT_PLACARD_OPTIONS}
          />
        </Field>
        <Field
          label="24-hr emergency contact"
          htmlFor="hazmatEmergencyContact"
          optional
          hint="e.g. CHEMTREC contract number"
        >
          <Input
            id="hazmatEmergencyContact"
            name="hazmatEmergencyContact"
            defaultValue={prefill?.hazmatEmergencyContact ?? ""}
          />
        </Field>
        <Field label="Technical name" htmlFor="hazmatTechnicalName" optional>
          <Input
            id="hazmatTechnicalName"
            name="hazmatTechnicalName"
            defaultValue={prefill?.hazmatTechnicalName ?? ""}
          />
        </Field>
      </div>
      <Field label="Anything else about the hazmat?" htmlFor="hazmatDetails" optional>
        <Textarea
          id="hazmatDetails"
          name="hazmatDetails"
          defaultValue={prefill?.hazmatDetails ?? ""}
          placeholder="Limited quantity, RQ, special permits, ..."
        />
      </Field>
      <p className="rounded-lg bg-gold/15 px-3 py-2 text-sm text-ink">
        Hazmat moves get a manual review before we quote. We will come back to
        you quickly with any questions.
      </p>
    </div>
  );
}
