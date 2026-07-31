import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentList } from "@/components/portal/document-list";
import { EventTimeline } from "@/components/portal/event-timeline";
import { HazmatBlock } from "@/components/portal/hazmat-block";
import { LoadProgress } from "@/components/portal/load-progress";
import { LoadStatusBadge } from "@/components/portal/status";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoadDetail } from "@/lib/portal/queries";
import { accessorialLabel, equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { requireOrgSession } from "@/lib/portal/session";

export const metadata: Metadata = {
  title: "Load - Peer Freight",
  robots: { index: false },
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function fmtDate(iso: string) {
  return dateFmt.format(new Date(`${iso}T12:00:00`));
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}

export default async function LoadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, db, org } = await requireOrgSession();
  const detail = await getLoadDetail(db, session.user.id, org.id, id);
  if (!detail) notFound();
  const { load, events, documents, carrier } = detail;
  // Carrier details surface once the truck is actually moving on this load.
  const showCarrier = carrier && !["booked", "cancelled"].includes(load.status);

  return (
    <div className="space-y-6">
      <div>
        <a href="/loads" className="text-sm font-bold text-muted hover:text-ink">
          ← All loads
        </a>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold">
            {load.reference} · {laneSummary(load)}
          </h1>
          <LoadStatusBadge status={load.status} />
        </div>
        <p className="mt-1 text-muted">
          Pickup {fmtDate(load.pickupDate)} · Delivery {fmtDate(load.deliveryDate)} ·{" "}
          {equipmentLabel(load.equipment)} · {load.commodity}
        </p>
      </div>

      <Card>
        <LoadProgress status={load.status} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card>
            <h2 className="section-label">Load details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail
                label="Pickup"
                value={
                  <>
                    {load.originAddress ? <>{load.originAddress}<br /></> : null}
                    {load.originCity}, {load.originState} {load.originZip}
                    {load.originHours ? <><br />Hours: {load.originHours}</> : null}
                    <br />
                    {load.originScheduling === "appointment" ? "Appointment required" : "First come, first served"}
                  </>
                }
              />
              <Detail
                label="Delivery"
                value={
                  <>
                    {load.destAddress ? <>{load.destAddress}<br /></> : null}
                    {load.destCity}, {load.destState} {load.destZip}
                    {load.destHours ? <><br />Hours: {load.destHours}</> : null}
                    <br />
                    {load.destScheduling === "appointment" ? "Appointment required" : "First come, first served"}
                  </>
                }
              />
              <Detail
                label="Pickup date"
                value={`${fmtDate(load.pickupDate)}${load.pickupWindow ? ` (${load.pickupWindow})` : ""}`}
              />
              <Detail
                label="Delivery date"
                value={`${fmtDate(load.deliveryDate)}${load.deliveryWindow ? ` (${load.deliveryWindow})` : ""}`}
              />
              <Detail label="Commodity" value={load.commodity} />
              <Detail label="Weight" value={`${load.weightLbs.toLocaleString("en-US")} lbs`} />
              <Detail label="Pieces / pallets" value={load.pieces} />
              <Detail label="Dimensions" value={load.dims} />
              <Detail
                label="Equipment"
                value={`${equipmentLabel(load.equipment)}${load.temperatureF ? ` at ${load.temperatureF}F` : ""}${load.equipmentNotes ? ` (${load.equipmentNotes})` : ""}`}
              />
              <Detail
                label="Declared value"
                value={load.declaredValueUsd ? `$${Number(load.declaredValueUsd).toLocaleString("en-US")}` : null}
              />
              <HazmatBlock r={load} />
              <Detail
                label="Services"
                value={
                  load.accessorials.length > 0
                    ? load.accessorials.map(accessorialLabel).join(", ")
                    : null
                }
              />
              <Detail
                label="References"
                value={
                  load.referenceNumbers.length > 0
                    ? load.referenceNumbers.map((r) => `${r.label}: ${r.value}`).join(" · ")
                    : null
                }
              />
              <Detail
                label="Agreed rate"
                value={`$${Number(load.allInRateUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })} all-in`}
              />
              <Detail label="Notes" value={load.notes} />
            </dl>
          </Card>
        </div>

        <div className="space-y-4">
          {showCarrier ? (
            <Card>
              <h2 className="section-label">Your carrier</h2>
              <dl className="mt-4 grid gap-4">
                <Detail label="Carrier" value={carrier.carrierName} />
                <Detail label="MC number" value={carrier.mcNumber} />
                <Detail
                  label="Driver"
                  value={
                    carrier.driverName
                      ? `${carrier.driverName}${carrier.driverPhone ? ` · ${carrier.driverPhone}` : ""}`
                      : carrier.driverPhone
                  }
                />
                <Detail
                  label="Equipment"
                  value={
                    carrier.truckNumber || carrier.trailerNumber
                      ? [
                          carrier.truckNumber ? `Truck ${carrier.truckNumber}` : null,
                          carrier.trailerNumber ? `Trailer ${carrier.trailerNumber}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : null
                  }
                />
              </dl>
              {carrier.trackingUrl ? (
                <div className="mt-4">
                  <LinkButton href={carrier.trackingUrl} target="_blank" rel="noopener noreferrer">
                    Track this shipment →
                  </LinkButton>
                </div>
              ) : null}
            </Card>
          ) : null}
          <Card>
            <h2 className="section-label">Documents</h2>
            {documents.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                Rate confirmation, BOL, POD, and invoice post here as we
                collect them.
              </p>
            ) : (
              <div className="mt-2">
                <DocumentList documents={documents} />
              </div>
            )}
          </Card>
          <Card>
            <h2 className="section-label">Timeline</h2>
            <div className="mt-4">
              <EventTimeline events={events} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
