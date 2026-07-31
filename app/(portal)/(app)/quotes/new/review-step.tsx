"use client";

import {
  FREQUENCY_OPTIONS,
  accessorialLabel,
  equipmentLabel,
  hazmatSummary,
  type RfqInput,
} from "@/lib/portal/rfq";
import { formatDateDisplay } from "@/lib/portal/dates";

function stopLine(
  address: string | null | undefined,
  city: string,
  state: string,
  zip: string,
) {
  return [address, `${city}, ${state} ${zip}`].filter(Boolean).join(", ");
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 py-1.5">
      <dt className="w-36 shrink-0 text-sm font-bold text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function Group({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="flex items-baseline justify-between gap-4">
        <h3 className="section-label">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="text-sm font-bold text-navy hover:underline"
        >
          Edit
        </button>
      </header>
      <dl className="mt-2 divide-y divide-line rounded-lg bg-paper px-4 py-1.5">{children}</dl>
    </section>
  );
}

/** Step 4: everything the desk will price, grouped, with jump-back links. */
export function ReviewStep({
  data,
  onEdit,
}: {
  data: RfqInput;
  onEdit: (step: number) => void;
}) {
  const scheduling = (v: string) =>
    v === "appointment" ? "Appointment required" : "First come, first served";
  return (
    <div className="space-y-6">
      <Group title="Lane & dates" step={1} onEdit={onEdit}>
        <Row
          label="Pickup"
          value={
            <>
              {stopLine(data.originAddress, data.originCity, data.originState, data.originZip)}
              <span className="block text-muted">
                {scheduling(data.originScheduling)}
                {data.originHours ? ` · Hours: ${data.originHours}` : ""}
              </span>
            </>
          }
        />
        <Row
          label="Delivery"
          value={
            <>
              {stopLine(data.destAddress, data.destCity, data.destState, data.destZip)}
              <span className="block text-muted">
                {scheduling(data.destScheduling)}
                {data.destHours ? ` · Hours: ${data.destHours}` : ""}
              </span>
            </>
          }
        />
        <Row
          label="Pickup date"
          value={`${formatDateDisplay(data.pickupDate)}${data.pickupWindow ? ` (${data.pickupWindow})` : ""}`}
        />
        <Row
          label="Delivery date"
          value={`${formatDateDisplay(data.deliveryDate)}${data.deliveryWindow ? ` (${data.deliveryWindow})` : ""}${data.dateFlexibility === "flexible" ? " · flexible" : " · firm"}`}
        />
      </Group>

      <Group title="Freight" step={2} onEdit={onEdit}>
        <Row label="Commodity" value={data.commodity} />
        <Row label="Weight" value={`${data.weightLbs.toLocaleString("en-US")} lbs`} />
        <Row label="Pieces / pallets" value={data.pieces} />
        <Row label="Dimensions" value={data.dims} />
        <Row
          label="Equipment"
          value={`${equipmentLabel(data.equipment)}${data.temperatureF ? ` at ${data.temperatureF}F` : ""}${data.equipmentNotes ? ` (${data.equipmentNotes})` : ""}`}
        />
        <Row
          label="Declared value"
          value={
            data.declaredValueUsd
              ? `$${Number(data.declaredValueUsd).toLocaleString("en-US")}`
              : null
          }
        />
        <Row label="Hazmat" value={data.hazmat ? hazmatSummary(data) : null} />
      </Group>

      <Group title="Services & extras" step={3} onEdit={onEdit}>
        <Row
          label="Services"
          value={
            data.accessorials.length > 0
              ? data.accessorials.map(accessorialLabel).join(", ")
              : "None"
          }
        />
        <Row
          label="References"
          value={
            data.referenceNumbers.length > 0
              ? data.referenceNumbers.map((r) => `${r.label}: ${r.value}`).join(" · ")
              : "None"
          }
        />
        <Row
          label="Target rate"
          value={
            data.targetRateUsd ? `$${Number(data.targetRateUsd).toLocaleString("en-US")}` : null
          }
        />
        <Row
          label="Frequency"
          value={FREQUENCY_OPTIONS.find((o) => o.value === data.frequency)?.label}
        />
        <Row label="Notes" value={data.notes} />
      </Group>
    </div>
  );
}
