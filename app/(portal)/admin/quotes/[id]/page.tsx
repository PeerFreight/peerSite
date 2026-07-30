import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/portal/app-shell";
import { EventTimeline } from "@/components/portal/event-timeline";
import { PortalNav } from "@/components/portal/portal-nav";
import { StatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { getQuoteRequestForAdmin } from "@/lib/portal/admin-queries";
import { accessorialLabel, equipmentLabel, laneSummary } from "@/lib/portal/rfq";
import { requireAdminSession } from "@/lib/portal/session";
import { SignOutButton } from "../../../sign-out-button";
import { NeedsInfoForm, SendQuoteForm } from "./admin-forms";

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
  const { request, orgName, requesterName, requesterEmail, quotes, events } = detail;
  const open = ["submitted", "needs_info"].includes(request.status);

  return (
    <AppShell
      nav={<PortalNav active="admin" admin />}
      user={<SignOutButton label={session.user.name} />}
    >
      <div className="space-y-6">
        <div>
          <a href="/admin" className="text-sm font-bold text-muted hover:text-ink">
            ← Queue
          </a>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold">{laneSummary(request)}</h1>
            <StatusBadge status={request.status} />
            {request.hazmat ? <Badge tone="red">Hazmat</Badge> : null}
          </div>
          <p className="mt-1 text-muted">
            {orgName} · {requesterName} ({requesterEmail}) · submitted{" "}
            {dateTimeFmt.format(request.createdAt)} PT
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-6">
            <Card>
              <CardTitle>Request</CardTitle>
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
                <Detail label="Hazmat" value={request.hazmat ? request.hazmatDetails ?? "Yes, no details" : null} />
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
                <CardTitle>Quotes sent</CardTitle>
                <ul className="mt-3 space-y-3">
                  {quotes.map((q) => (
                    <li key={q.id} className="rounded-lg bg-white p-4">
                      <p className="font-extrabold text-ink">
                        ${Number(q.allInRateUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                        <span className="text-sm font-bold text-muted">({q.status})</span>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{q.serviceDescription}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <Card>
              <CardTitle>Timeline</CardTitle>
              <div className="mt-4">
                <EventTimeline events={events} />
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardTitle>Send quote</CardTitle>
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
                <CardTitle>Needs info</CardTitle>
                <div className="mt-4">
                  <NeedsInfoForm requestId={request.id} />
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
