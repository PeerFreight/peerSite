const EVENT_LABELS: Record<string, string> = {
  rfq_submitted: "Quote request submitted",
  needs_info: "We asked for more info",
  quote_sent: "Quote sent",
  quote_declined: "Quote declined",
  quote_accepted: "Quote accepted",
  load_booked: "Load booked",
  load_dispatched: "Carrier dispatched",
  load_in_transit: "Picked up — in transit",
  load_delivered: "Delivered",
  load_invoiced: "Invoiced",
  load_closed: "Load closed",
  load_cancelled: "Load cancelled",
  document_added: "Document posted",
  document_uploaded_internal: "Document uploaded (internal)",
  document_hidden: "Document hidden from shipper",
  carrier_assigned: "Carrier assigned",
  carrier_updated: "Carrier details updated",
  org_renamed: "Company renamed",
  load_delayed: "Delay flagged",
  load_delay_cleared: "Back on schedule",
  invoice_created: "Invoice issued",
  invoice_paid: "Invoice paid",
  update_sent: "Update from Peer Freight",
  teammate_invited: "Teammate invited",
};

const etaFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** Sub-line under the label: the human detail an event carries, if any. */
function eventMessage(event: TimelineEvent): string | null {
  const p = event.payload ?? {};
  switch (event.eventType) {
    case "needs_info":
      return typeof p.message === "string" ? p.message : null;
    case "load_booked":
      return typeof p.reference === "string" ? `Reference ${p.reference}` : null;
    case "document_added":
      return typeof p.label === "string" ? p.label : null;
    case "load_delayed":
      return typeof p.reason === "string"
        ? p.reason +
            (typeof p.revisedDeliveryDate === "string"
              ? ` · revised ETA ${etaFmt.format(new Date(`${p.revisedDeliveryDate}T12:00:00`))}`
              : "")
        : null;
    case "invoice_created":
      return typeof p.number === "string" && typeof p.amountUsd === "string"
        ? `${p.number} · $${Number(p.amountUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })}${typeof p.dueDate === "string" ? ` due ${etaFmt.format(new Date(`${p.dueDate}T12:00:00`))}` : ""}`
        : null;
    case "invoice_paid":
      return typeof p.number === "string" ? p.number : null;
    case "update_sent":
      return typeof p.body === "string" ? p.body : null;
    case "teammate_invited":
      return typeof p.email === "string" ? p.email : null;
    default:
      // Status steps and quote sends can carry a founder note.
      return typeof p.note === "string" ? p.note : null;
  }
}

const timeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
});

export type TimelineEvent = {
  id: string;
  eventType: string;
  actorType: string;
  payload: Record<string, unknown> | null;
  createdAt: Date;
};

/** Events-driven status timeline, newest first. Reads straight off the
 * append-only events table, so it always matches what actually happened.
 * `showVia` (admin surfaces only) tags events an agent executed for a
 * founder; the shipper timeline never renders the channel. */
export function EventTimeline({
  events,
  showVia = false,
}: {
  events: TimelineEvent[];
  showVia?: boolean;
}) {
  if (events.length === 0) return null;
  return (
    <ol className="space-y-0">
      {events.map((event, i) => {
        const message = eventMessage(event);
        const exception = ["load_delayed", "load_cancelled"].includes(event.eventType);
        return (
          <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
            {i < events.length - 1 ? (
              <span aria-hidden className="absolute left-[5px] top-4 h-full w-px bg-line" />
            ) : null}
            <span
              aria-hidden
              className={`mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${exception ? "bg-red-700" : "bg-navy"}`}
            />
            <div>
              <p className="text-sm font-bold text-ink">
                {EVENT_LABELS[event.eventType] ?? event.eventType.replaceAll("_", " ")}
              </p>
              {message ? <p className="mt-0.5 text-sm text-muted">{message}</p> : null}
              <p className="mt-0.5 text-xs text-muted">
                {timeFmt.format(event.createdAt)} PT
                {showVia && event.payload?.via === "agent" ? " · via agent" : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
