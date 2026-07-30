import type { LoadStatus } from "@/db/schema";

/**
 * Load status vocabulary shared by the shipper and admin views, plus the
 * transition rules the admin stepper enforces. The statuses are the
 * shipper-visible simplification agreed in the portal plan; the append-only
 * events table keeps the full history.
 */

export const LOAD_STATUS_LABELS: Record<LoadStatus, string> = {
  booked: "Booked",
  dispatched: "Dispatched",
  in_transit: "In transit",
  delivered: "Delivered",
  invoiced: "Invoiced",
  closed: "Closed",
  cancelled: "Cancelled",
};

/** The forward path a healthy load walks, in order. */
export const LOAD_STATUS_PATH: LoadStatus[] = [
  "booked",
  "dispatched",
  "in_transit",
  "delivered",
  "invoiced",
  "closed",
];

/** Statuses that still need desk attention (drive the dashboards). */
export const ACTIVE_LOAD_STATUSES: LoadStatus[] = [
  "booked",
  "dispatched",
  "in_transit",
  "delivered",
  "invoiced",
];

/** Legal transitions. Cancel is allowed until the freight has delivered;
 * after that the money path (invoiced → closed) is the only way out. */
export const LOAD_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  booked: ["dispatched", "cancelled"],
  dispatched: ["in_transit", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: ["invoiced"],
  invoiced: ["closed"],
  closed: [],
  cancelled: [],
};

export function canTransition(from: LoadStatus, to: LoadStatus) {
  return LOAD_TRANSITIONS[from].includes(to);
}

/** Event type written for each transition; the timeline renders from these. */
export const LOAD_STATUS_EVENT: Record<Exclude<LoadStatus, "booked">, string> = {
  dispatched: "load_dispatched",
  in_transit: "load_in_transit",
  delivered: "load_delivered",
  invoiced: "load_invoiced",
  closed: "load_closed",
  cancelled: "load_cancelled",
};

/** Shipper-facing one-liners for the status-change emails. */
export const LOAD_STATUS_EMAIL: Record<
  Exclude<LoadStatus, "booked">,
  { subject: (ref: string) => string; body: string }
> = {
  dispatched: {
    subject: (ref) => `${ref} dispatched — carrier assigned`,
    body: "A carrier is assigned and dispatched to your pickup. Carrier and driver details are on the load page.",
  },
  in_transit: {
    subject: (ref) => `${ref} picked up and in transit`,
    body: "Your freight is picked up and rolling. We track it and flag anything that threatens the delivery window.",
  },
  delivered: {
    subject: (ref) => `${ref} delivered`,
    body: "Your freight is delivered. The proof of delivery posts to your documents as soon as we collect it.",
  },
  invoiced: {
    subject: (ref) => `${ref} invoiced`,
    body: "The invoice for this load is posted under its documents.",
  },
  closed: {
    subject: (ref) => `${ref} closed`,
    body: "This load is fully settled and closed. Thanks for shipping with Peer.",
  },
  cancelled: {
    subject: (ref) => `${ref} cancelled`,
    body: "This load is cancelled. If that is unexpected, reply to this email and we will sort it out immediately.",
  },
};
