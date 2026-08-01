import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventTimeline } from "@/components/portal/event-timeline";
import { HazmatBlock } from "@/components/portal/hazmat-block";
import { StatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getQuoteRequestForAdmin } from "@/lib/portal/admin-queries";
import { accessorialLabel, equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { requireAdminSession } from "@/lib/portal/session";
import { AdminNav } from "../../admin-nav";
import { BookLoadForm, NeedsInfoForm, SendQuoteForm } from "./admin-forms";

export const metadata: Metadata = {
  title: "Quote request (admin) - Peer Freight",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
});

export default async function AdminQuoteRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, db } = await requireAdminSession();
  const detail = await getQuoteRequestForAdmin(db, session.user, id);
  if (!detail) notFound();
  const { request, orgName, requesterName, requesterEmail, quotes, events, loads } = detail;
  const open = ["submitted", "needs_info"].includes(request.status);
  const loadForQuote = (quoteId: string) => loads.find((l) => l.quoteId === quoteId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <a href="/admin" className="text-sm font-bold text-muted hover:text-ink">
            ← Queue
          </a>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold">{laneSummary(request)}</h1>
            <StatusBadge status={request.status} />
            {request.hazmat ? (
              <Badge tone="red">
                {request.hazmatClass ? `Hazmat ${request.hazmatClass}` : "Hazmat"}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-muted">
            {orgName} · {requesterName} ({requesterEmail}) · submitted{" "}
            {dateTimeFmt.format(request.createdAt)} PT
          </p>
        </div>
        <AdminNav active="queue" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <Card>
            <h2 className="section-label">Request</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail
                label="Pickup"
                value={
                  <>
                    {request.originAddress ? <>{request.originAddress}<br /></> : null}
                    {request.originCity}, {request.originState} {request.originZip}
                    {request.originHours ? <><br />Hours: {request.originHours}</> : null}
                    <br />
                    {request.originScheduling === "appointment" ? "Appointment" : "FCFS"}
                  </>
                }
              />
              <Detail
                label="Delivery"
                value={
                  <>
                    {request.destAddress ? <>{request.destAddress}<br /></> : null}
                    {request.destCity}, {request.destState} {request.destZip}
                    {request.destHours ? <><br />Hours: {request.destHours}</> : null}
                    <br />
                    {request.destScheduling === "appointment" ? "Appointment" : "FCFS"}
                  </>
                }
              />
              <Detail
                label="Pickup"
                value={`${request.pickupDate}${request.pickupWindow ? ` (${request.pickupWindow})` : ""}`}
              />
              <Detail
                label="Delivery"
                value={`${request.deliveryDate}${request.deliveryWindow ? ` (${request.deliveryWindow})` : ""}${request.dateFlexibility === "flexible" ? " · flexible" : " · firm"}`}
              />
              <Detail label="Commodity" value={request.commodity} />
              <Detail label="Weight" value={`${request.weightLbs.toLocaleString("en-US")} lbs`} />
              <Detail label="Pieces / pallets" value={request.pieces} />
              <Detail label="Dimensions" value={request.dims} />
              <Detail
                label="Equipment"
                value={`${equipmentLabel(request.equipment)}${request.temperatureF ? ` at ${request.temperatureF}F` : ""}${request.equipmentNotes ? ` (${request.equipmentNotes})` : ""}`}
              />
              <Detail
                label="Declared value"
                value={request.declaredValueUsd ? `$${Number(request.declaredValueUsd).toLocaleString("en-US")}` : "Not given"}
              />
              <HazmatBlock r={request} />
              <Detail
                label="Services"
                value={
                  request.accessorials.length > 0
                    ? request.accessorials.map(accessorialLabel).join(", ")
                    : null
                }
              />
              <Detail
                label="References"
                value={
                  request.referenceNumbers.length > 0
                    ? request.referenceNumbers.map((r) => `${r.label}: ${r.value}`).join(" · ")
                    : null
                }
              />
              <Detail
                label="Shipper target rate"
                value={
                  request.targetRateUsd
                    ? `$${Number(request.targetRateUsd).toLocaleString("en-US")} (context only; do not anchor the buy estimate)`
                    : null
                }
              />
              <Detail label="Frequency" value={request.frequency.replaceAll("_", " ")} />
              <Detail label="Notes" value={request.notes} />
            </dl>
          </Card>

          {quotes.length > 0 ? (
            <Card>
              <h2 className="section-label">Quotes sent</h2>
              <ul className="mt-3 space-y-3">
                {quotes.map((q) => {
                  const load = loadForQuote(q.id);
                  return (
                    <li key={q.id} className="rounded-lg border border-line bg-paper p-4">
                      <p className="font-extrabold text-ink">
                        ${Number(q.allInRateUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                        <span className="text-sm font-bold text-muted">({q.status})</span>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{q.serviceDescription}</p>
                      <div className="mt-3">
                        {load ? (
                          <a
                            href={`/admin/loads/${load.id}`}
                            className="text-sm font-bold text-navy hover:underline"
                          >
                            Booked as {load.reference} →
                          </a>
                        ) : ["sent", "accepted"].includes(q.status) ? (
                          <BookLoadForm quoteId={q.id} requestId={request.id} />
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}

          <Card>
            <h2 className="section-label">Timeline</h2>
            <div className="mt-4">
              <EventTimeline events={events} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="section-label">Send quote</h2>
            <p className="mt-1 text-sm text-muted">
              Shipper-facing all-in rate only. Buy rates and margin stay out
              of the portal.
            </p>
            <div className="mt-4">
              {["submitted", "needs_info", "quoted"].includes(request.status) ? (
                <SendQuoteForm requestId={request.id} />
              ) : (
                <p className="text-sm text-muted">This request is {request.status}; no further quoting.</p>
              )}
            </div>
          </Card>
          {open ? (
            <Card>
              <h2 className="section-label">Needs info</h2>
              <div className="mt-4">
                <NeedsInfoForm requestId={request.id} />
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
