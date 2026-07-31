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
};

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
 * append-only events table, so it always matches what actually happened. */
export function EventTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null;
  return (
    <ol className="space-y-0">
      {events.map((event, i) => {
        const message =
          event.eventType === "needs_info" && typeof event.payload?.message === "string"
            ? event.payload.message
            : event.eventType === "load_booked" && typeof event.payload?.reference === "string"
              ? `Reference ${event.payload.reference}`
              : event.eventType === "document_added" && typeof event.payload?.label === "string"
                ? event.payload.label
                : null;
        return (
          <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
            {i < events.length - 1 ? (
              <span aria-hidden className="absolute left-[5px] top-4 h-full w-px bg-line" />
            ) : null}
            <span aria-hidden className="mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full bg-navy" />
            <div>
              <p className="text-sm font-bold text-ink">
                {EVENT_LABELS[event.eventType] ?? event.eventType.replaceAll("_", " ")}
              </p>
              {message ? <p className="mt-0.5 text-sm text-muted">{message}</p> : null}
              <p className="mt-0.5 text-xs text-muted">{timeFmt.format(event.createdAt)} PT</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
