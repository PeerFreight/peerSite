import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentList } from "@/components/portal/document-list";
import { EventTimeline } from "@/components/portal/event-timeline";
import { HazmatBlock } from "@/components/portal/hazmat-block";
import { LoadProgress } from "@/components/portal/load-progress";
import { DelayBadge, LoadStatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getLoadForAdmin } from "@/lib/portal/admin-queries";
import { formatDateDisplay } from "@/lib/portal/dates";
import { INVOICE_STATUS_LABELS } from "@/lib/portal/invoices";
import { LOAD_TRANSITIONS } from "@/lib/portal/loads";
import { accessorialLabel, equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { requireAdminSession } from "@/lib/portal/session";
import { AdminNav } from "../../admin-nav";
import { ClearDelayForm, SetDelayForm } from "./delay-form";
import { CreateInvoiceForm, MarkPaidForm } from "./invoice-form";
import {
  CarrierForm,
  StatusStepForm,
  ToggleDocumentVisibilityForm,
  UploadDocumentForm,
} from "./load-forms";

export const metadata: Metadata = {
  title: "Load (admin) - Peer Freight",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
});

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}

export default async function AdminLoadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, db } = await requireAdminSession();
  const detail = await getLoadForAdmin(db, session.user, id);
  if (!detail) notFound();
  const { load, orgName, requesterName, requesterEmail, events, documents, carrier, invoice } =
    detail;
  const nextSteps = LOAD_TRANSITIONS[load.status];
  const dispatchedOrLater = !["booked", "cancelled"].includes(load.status);
  const delayable = ["booked", "dispatched", "in_transit"].includes(load.status);
  const invoiceable = ["delivered", "invoiced"].includes(load.status) && !invoice;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <a href="/admin/loads" className="text-sm font-bold text-muted hover:text-ink">
            ← Loads
          </a>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold">
              {load.reference} · {laneSummary(load)}
            </h1>
            <LoadStatusBadge status={load.status} />
            <DelayBadge delayedAt={load.delayedAt} revisedDeliveryDate={load.revisedDeliveryDate} />
            {load.hazmat ? <Badge tone="red">Hazmat</Badge> : null}
          </div>
          <p className="mt-1 text-muted">
            {orgName} · {requesterName} ({requesterEmail}) · booked{" "}
            {dateTimeFmt.format(load.createdAt)} PT ·{" "}
            <a href={`/admin/quotes/${load.quoteRequestId}`} className="font-bold hover:text-ink">
              source RFQ →
            </a>
          </p>
        </div>
        <AdminNav active="loads" />
      </div>

      <Card>
        <LoadProgress status={load.status} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <Card>
            <h2 className="section-label">Load</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail
                label="Pickup"
                value={
                  <>
                    {load.originAddress ? <>{load.originAddress}<br /></> : null}
                    {load.originCity}, {load.originState} {load.originZip}
                    {load.originHours ? <><br />Hours: {load.originHours}</> : null}
                    <br />
                    {load.originScheduling === "appointment" ? "Appointment" : "FCFS"}
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
                    {load.destScheduling === "appointment" ? "Appointment" : "FCFS"}
                  </>
                }
              />
              <Detail
                label="Pickup"
                value={`${formatDateDisplay(load.pickupDate)}${load.pickupWindow ? ` (${load.pickupWindow})` : ""}`}
              />
              <Detail
                label="Delivery"
                value={`${formatDateDisplay(load.deliveryDate)}${load.deliveryWindow ? ` (${load.deliveryWindow})` : ""}`}
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
                value={load.declaredValueUsd ? `$${Number(load.declaredValueUsd).toLocaleString("en-US")}` : "Not given"}
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
                label="Sell rate"
                value={`$${Number(load.allInRateUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })} all-in (shipper-facing)`}
              />
              <Detail label="Notes" value={load.notes} />
            </dl>
          </Card>

          <Card>
            <h2 className="section-label">Timeline</h2>
            <div className="mt-4">
              <EventTimeline events={events} showVia />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="section-label">Move the load</h2>
            <p className="mt-1 text-sm text-muted">
              Each step writes the timeline and emails the shipper.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {nextSteps.length === 0 ? (
                <p className="text-sm text-muted">This load is {load.status}; nothing left to do.</p>
              ) : (
                nextSteps.map((next) => (
                  <StatusStepForm key={next} loadId={load.id} next={next} />
                ))
              )}
            </div>
          </Card>

          {delayable || load.delayedAt ? (
            <Card>
              <h2 className="section-label">Exception</h2>
              {load.delayedAt ? (
                <div className="mt-1 space-y-3">
                  <p className="text-sm font-bold text-red-700">
                    Delayed: {load.delayReason}
                    {load.revisedDeliveryDate ? ` (revised ETA ${load.revisedDeliveryDate})` : ""}
                  </p>
                  <ClearDelayForm loadId={load.id} />
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  Flagging a delay emails the shipper and marks the load until you clear it.
                </p>
              )}
              {delayable ? (
                <div className={load.delayedAt ? "mt-4 border-t border-line pt-4" : "mt-4"}>
                  <SetDelayForm
                    loadId={load.id}
                    delayed={Boolean(load.delayedAt)}
                    defaultReason={load.delayReason}
                    defaultRevised={load.revisedDeliveryDate}
                  />
                </div>
              ) : null}
            </Card>
          ) : null}

          {invoiceable || invoice ? (
            <Card>
              <h2 className="section-label">Invoice</h2>
              {invoice ? (
                <div className="mt-4 space-y-4">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Detail label="Invoice" value={invoice.number} />
                    <Detail
                      label="Amount"
                      value={`$${Number(invoice.amountUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                    />
                    <Detail label="Due" value={formatDateDisplay(invoice.dueDate)} />
                    <Detail label="Status" value={INVOICE_STATUS_LABELS[invoice.status]} />
                  </dl>
                  {invoice.status === "open" ? (
                    <MarkPaidForm invoiceId={invoice.id} loadId={load.id} />
                  ) : null}
                </div>
              ) : (
                <div className="mt-4">
                  <p className="mb-4 text-sm text-muted">
                    Issuing the invoice emails the shipper and moves the load to invoiced.
                  </p>
                  <CreateInvoiceForm loadId={load.id} defaultAmount={load.allInRateUsd} />
                </div>
              )}
            </Card>
          ) : null}

          <Card>
            <h2 className="section-label">Carrier</h2>
            <p className="mt-1 text-sm text-muted">
              {carrier
                ? carrier.visibleToShipper
                  ? "Shared with the shipper."
                  : "Not visible to the shipper yet."
                : "No carrier assigned yet."}
            </p>
            <div className="mt-4">
              <CarrierForm
                loadId={load.id}
                carrier={carrier}
                suggestVisible={dispatchedOrLater}
              />
            </div>
          </Card>

          <Card>
            <h2 className="section-label">Documents</h2>
            {documents.length > 0 ? (
              <div className="mt-2">
                <DocumentList
                  documents={documents}
                  extra={(doc) => {
                    const full = documents.find((d) => d.id === doc.id)!;
                    return (
                      <span className="flex items-center gap-2">
                        {full.visibleToShipper ? (
                          <span className="text-xs font-bold text-green-800">Shared</span>
                        ) : (
                          <span className="text-xs font-bold text-muted">Internal</span>
                        )}
                        <ToggleDocumentVisibilityForm
                          documentId={doc.id}
                          loadId={load.id}
                          visible={full.visibleToShipper}
                        />
                      </span>
                    );
                  }}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">Nothing uploaded yet.</p>
            )}
            <div className="mt-4 border-t border-line pt-4">
              <UploadDocumentForm loadId={load.id} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
