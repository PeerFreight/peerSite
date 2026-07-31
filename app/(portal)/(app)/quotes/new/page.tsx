import type { Metadata } from "next";
import type * as schema from "@/db/schema";
import { getQuoteRequestDetail, listQuoteRequests } from "@/lib/portal/queries";
import { laneSummary } from "@/lib/portal/rfq";
import { requireOrgSession } from "@/lib/portal/session";
import { RecentRequestPicker } from "./recent-request-picker";
import { RfqForm, type RfqPrefill } from "./rfq-form";

export const metadata: Metadata = {
  title: "Request a quote - Peer Freight",
  robots: { index: false },
};

/** Duplicate-previous: copy everything except the dates — those never
 * carry over to a new shipment. */
function prefillFromRequest(r: typeof schema.quoteRequests.$inferSelect): RfqPrefill {
  return {
    originAddress: r.originAddress,
    originCity: r.originCity,
    originState: r.originState,
    originZip: r.originZip,
    originHours: r.originHours,
    originScheduling: r.originScheduling,
    destAddress: r.destAddress,
    destCity: r.destCity,
    destState: r.destState,
    destZip: r.destZip,
    destHours: r.destHours,
    destScheduling: r.destScheduling,
    pickupWindow: r.pickupWindow,
    deliveryWindow: r.deliveryWindow,
    dateFlexibility: r.dateFlexibility,
    commodity: r.commodity,
    weightLbs: r.weightLbs,
    pieces: r.pieces,
    dims: r.dims,
    declaredValueUsd: r.declaredValueUsd,
    equipment: r.equipment,
    temperatureF: r.temperatureF,
    equipmentNotes: r.equipmentNotes,
    hazmat: r.hazmat,
    hazmatUnNumber: r.hazmatUnNumber,
    hazmatShippingName: r.hazmatShippingName,
    hazmatClass: r.hazmatClass,
    hazmatPackingGroup: r.hazmatPackingGroup,
    hazmatQuantity: r.hazmatQuantity,
    hazmatPlacardsRequired: r.hazmatPlacardsRequired,
    hazmatEmergencyContact: r.hazmatEmergencyContact,
    hazmatTechnicalName: r.hazmatTechnicalName,
    hazmatDetails: r.hazmatDetails,
    accessorials: r.accessorials,
    referenceNumbers: r.referenceNumbers,
    targetRateUsd: r.targetRateUsd,
    frequency: r.frequency,
    notes: r.notes,
  };
}

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const { session, db, org } = await requireOrgSession();
  const recent = (await listQuoteRequests(db, session.user.id, org.id)).slice(0, 8);

  let prefill: RfqPrefill | undefined;
  if (from) {
    // Org-scoped detail lookup — no new authz surface for the prefill path.
    const detail = await getQuoteRequestDetail(db, session.user.id, org.id, from);
    if (detail) prefill = prefillFromRequest(detail.request);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Request a quote</h1>
          <p className="mt-1 text-muted">
            The more complete this is, the faster we can price it. Missing
            details are the number one thing that slows a quote down.
          </p>
        </div>
        {recent.length > 0 ? (
          <RecentRequestPicker
            options={recent.map((r) => ({
              id: r.id,
              label: `${laneSummary(r)} · ${r.commodity}`,
            }))}
            selected={prefill ? from : undefined}
          />
        ) : null}
      </div>
      <RfqForm key={prefill ? from : "blank"} prefill={prefill} />
    </div>
  );
}
