import {
  HAZMAT_PLACARD_OPTIONS,
  hazmatClassLabel,
  hazmatSummary,
  type HazmatFields,
} from "@/lib/portal/rfq";

type HazmatRow = HazmatFields & {
  hazmatPlacardsRequired?: string | null;
  hazmatEmergencyContact?: string | null;
  hazmatTechnicalName?: string | null;
};

function Line({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p>
      <span className="font-bold text-muted">{label}:</span> {value}
    </p>
  );
}

/**
 * Structured hazmat digest for the shipper and admin detail pages: the
 * one-line summary on a gold tint, then the shipping-paper details. Old
 * rows with only free-text `hazmatDetails` render the text alone.
 */
export function HazmatBlock({ r }: { r: HazmatRow }) {
  if (!r.hazmat) return null;
  const placards = HAZMAT_PLACARD_OPTIONS.find(
    (o) => o.value === r.hazmatPlacardsRequired,
  )?.label;
  const summary = hazmatSummary(r);
  const hasStructure = Boolean(r.hazmatUnNumber || r.hazmatShippingName || r.hazmatClass);
  return (
    <div className="rounded-lg bg-gold/10 p-4 sm:col-span-2">
      <p className="text-xs font-bold uppercase tracking-wide text-navy">Hazmat</p>
      <p className="mt-1 text-sm font-extrabold text-ink">{summary}</p>
      <div className="mt-2 space-y-1 text-sm text-ink">
        {hasStructure && r.hazmatClass ? (
          <Line label="Class" value={hazmatClassLabel(r.hazmatClass)} />
        ) : null}
        <Line label="Placards" value={placards && placards !== "Not sure" ? placards : null} />
        <Line label="Emergency contact" value={r.hazmatEmergencyContact} />
        <Line label="Technical name" value={r.hazmatTechnicalName} />
        {hasStructure ? <Line label="Notes" value={r.hazmatDetails} /> : null}
      </div>
    </div>
  );
}
