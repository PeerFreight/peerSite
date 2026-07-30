import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/portal/app-shell";
import { EventTimeline } from "@/components/portal/event-timeline";
import { PortalNav } from "@/components/portal/portal-nav";
import { StatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { getQuoteRequestDetail } from "@/lib/portal/queries";
import { ACCEPT_DISABLED_NOTE, AUTHORITY_ACTIVE } from "@/lib/portal/gates";
import {
  STATUS_LABELS,
  accessorialLabel,
  equipmentLabel,
  laneSummary,
} from "@/lib/portal/rfq";
import { isAdmin } from "@/lib/portal/roles";
import { requireOrgSession } from "@/lib/portal/session";
import { SignOutButton } from "../../sign-out-button";
import { declineQuoteAction } from "../actions";

export const metadata: Metadata = {
  title: "Quote request - Peer Freight",
  robots: { index: false },
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
});

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

export default async function QuoteRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, db, org } = await requireOrgSession();
  const detail = await getQuoteRequestDetail(db, session.user.id, org.id, id);
  if (!detail) notFound();
  const { request, quotes, events } = detail;

  return (
    <AppShell
      nav={<PortalNav active="quotes" admin={isAdmin(session.user)} />}
      user={<SignOutButton label={session.user.name} />}
    >
      <div className="space-y-6">
        <div>
          <a href="/quotes" className="text-sm font-bold text-muted hover:text-ink">
            ← All quotes
          </a>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold">{laneSummary(request)}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-1 text-muted">
            Pickup {fmtDate(request.pickupDate)} · {equipmentLabel(request.equipment)} ·{" "}
            {request.commodity}
          </p>
        </div>

        {request.status === "needs_info" && request.needsInfoMessage ? (
          <Card className="bg-gold/15">
            <CardTitle>We need a bit more information</CardTitle>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{request.needsInfoMessage}</p>
            <p className="mt-3 text-sm text-muted">
              Reply to the email we sent, or write team@peer-freight.com with
              these details and we will finish your quote.
            </p>
          </Card>
        ) : null}

        {quotes.map((quote) => (
          <Card key={quote.id} className="border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  Your quote{quote.status !== "sent" ? ` (${quote.status})` : ""}
                </p>
                <p className="mt-1 text-3xl font-extrabold text-ink">
                  ${Number(quote.allInRateUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  <span className="ml-2 text-sm font-bold text-muted">all-in</span>
                </p>
              </div>
              {quote.validUntil ? (
                <Badge tone="neutral">
                  Valid until {dateTimeFmt.format(quote.validUntil)} PT
                </Badge>
              ) : null}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{quote.serviceDescription}</p>
            {quote.exclusions ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
                Not included: {quote.exclusions}
              </p>
            ) : null}
            {quote.status === "sent" ? (
              <div className="mt-5 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Button disabled={!AUTHORITY_ACTIVE} title={AUTHORITY_ACTIVE ? undefined : ACCEPT_DISABLED_NOTE}>
                    Accept quote
                  </Button>
                  <form action={declineQuoteAction.bind(null, quote.id, request.id)}>
                    <Button type="submit" variant="secondary">Decline</Button>
                  </form>
                </div>
                {!AUTHORITY_ACTIVE ? (
                  <p className="max-w-xl text-sm text-muted">{ACCEPT_DISABLED_NOTE}</p>
                ) : null}
              </div>
            ) : null}
          </Card>
        ))}

        {quotes.length === 0 && ["submitted", "needs_info"].includes(request.status) ? (
          <Card>
            <CardTitle>We're on it</CardTitle>
            <p className="mt-2 text-sm text-muted">
              Your request is with the desk. Expect a quote within the hour
              during business hours; you will get an email the moment it is
              ready.
            </p>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardTitle>Request details</CardTitle>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail
                label="Pickup"
                value={
                  <>
                    {request.originAddress ? <>{request.originAddress}<br /></> : null}
                    {request.originCity}, {request.originState} {request.originZip}
                    {request.originHours ? <><br />Hours: {request.originHours}</> : null}
                    <br />
                    {request.originScheduling === "appointment" ? "Appointment required" : "First come, first served"}
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
                    {request.destScheduling === "appointment" ? "Appointment required" : "First come, first served"}
                  </>
                }
              />
              <Detail
                label="Pickup date"
                value={`${fmtDate(request.pickupDate)}${request.pickupWindow ? ` (${request.pickupWindow})` : ""}`}
              />
              <Detail
                label="Delivery date"
                value={`${fmtDate(request.deliveryDate)}${request.deliveryWindow ? ` (${request.deliveryWindow})` : ""}${request.dateFlexibility === "flexible" ? " · flexible" : ""}`}
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
                value={request.declaredValueUsd ? `$${Number(request.declaredValueUsd).toLocaleString("en-US")}` : null}
              />
              <Detail
                label="Hazmat"
                value={request.hazmat ? request.hazmatDetails ?? "Yes" : null}
              />
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
                label="Target rate"
                value={request.targetRateUsd ? `$${Number(request.targetRateUsd).toLocaleString("en-US")}` : null}
              />
              <Detail
                label="Frequency"
                value={
                  request.frequency === "one_time"
                    ? "One-time shipment"
                    : request.frequency === "recurring"
                      ? "Recurring lane"
                      : "RFP / contract pricing"
                }
              />
              <Detail label="Notes" value={request.notes} />
            </dl>
          </Card>
          <Card>
            <CardTitle>Timeline</CardTitle>
            <div className="mt-4">
              <EventTimeline events={events} />
            </div>
          </Card>
        </div>

        <p className="text-xs text-muted">
          Status: {STATUS_LABELS[request.status]} · Submitted{" "}
          {dateTimeFmt.format(request.createdAt)} PT
        </p>
      </div>
    </AppShell>
  );
}
