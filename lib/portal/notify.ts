import { sendEmail } from "@/lib/email";
import { LOAD_STATUS_EMAIL } from "@/lib/portal/loads";
import { hazmatSummary, laneSummary, type RfqInput } from "@/lib/portal/rfq";
import { baseUrl } from "@/lib/portal/urls";
import type { LoadStatus } from "@/db/schema";

/**
 * Shipper-facing notification bodies, composed in one place so the web
 * actions and the agent CLI send byte-identical emails. Compose functions
 * are pure (data in, ComposedEmail out); `deliver` sends and returns the
 * composed message so a CLI caller can echo exactly what the client got.
 *
 * Nothing here imports tracking code: callers that want a tracking link
 * pass it through `extraLines`.
 */

export type ComposedEmail = { to: string; subject: string; text: string };

/** Shared mailbox operational emails should still feel like they came from
 * the founders. Invitations are excluded because a shipper may be the inviter. */
const CUSTOMER_SIGNOFF = ["Best,", "Aaron and Felix", "Peer Freight"] as const;

/** Join body lines, dropping null/undefined (mirrors the old inline style). */
function joinLines(lines: (string | null | undefined)[]): string {
  return lines.filter((line) => line !== null && line !== undefined).join("\n");
}

export async function deliver(email: ComposedEmail): Promise<ComposedEmail> {
  await sendEmail(email);
  return email;
}

export function composeQuoteSent(input: {
  to: string;
  requestId: string;
  allInRateUsd: string;
  serviceDescription: string;
  exclusions?: string | null;
  validUntil?: string | null;
  /** Founder's pricing rationale, rendered as a "How we priced it" paragraph. */
  note?: string | null;
}): ComposedEmail {
  const rate = Number(input.allInRateUsd).toLocaleString("en-US", { minimumFractionDigits: 2 });
  return {
    to: input.to,
    subject: "Your Peer Freight quote is ready",
    text: joinLines([
      `Good news, your quote is ready! The all-in price is $${rate}.`,
      "",
      input.serviceDescription,
      input.exclusions ? `\nNot included: ${input.exclusions}` : null,
      input.validUntil ? `\nThis quote is valid through ${input.validUntil}.` : null,
      input.note ? `\nHow we priced it: ${input.note}` : null,
      "",
      `View your quote: ${baseUrl()}/quotes/${input.requestId}`,
      "",
      "If you have any questions, please reply to this email. We're happy to help!",
      "",
      ...CUSTOMER_SIGNOFF,
    ]),
  };
}

export function composeNeedsInfo(input: {
  to: string;
  requestId: string;
  message: string;
}): ComposedEmail {
  return {
    to: input.to,
    subject: "Quick questions before we quote your shipment",
    text: joinLines([
      "Thanks for sending this over. We need a few more details before we can finish your quote:",
      "",
      input.message,
      "",
      `Update your request: ${baseUrl()}/quotes/${input.requestId}`,
      "",
      ...CUSTOMER_SIGNOFF,
    ]),
  };
}

export function composeLoadBooked(input: {
  to: string;
  reference: string;
  loadId: string;
}): ComposedEmail {
  return {
    to: input.to,
    subject: `Your shipment is booked! ${input.reference}`,
    text: joinLines([
      "Great news, your shipment is booked!",
      "",
      `Your reference number is ${input.reference}. Please include it whenever you contact us about this shipment.`,
      "",
      "We're finding and vetting the right carrier now. We'll email you as soon as the carrier is dispatched, and you will be able to see the carrier's contact details on your shipment page.",
      "",
      "Once the truck is on the road, we'll also send you a live tracking link that you can view and share without logging in.",
      "",
      `View your shipment: ${baseUrl()}/loads/${input.loadId}`,
      "",
      ...CUSTOMER_SIGNOFF,
    ]),
  };
}

export function composeLoadStatus(input: {
  to: string;
  reference: string;
  loadId: string;
  next: Exclude<LoadStatus, "booked">;
  /** Founder's context line, rendered as its own paragraph under the update. */
  note?: string | null;
  /** Extra standalone lines (e.g. the live tracking link) above the load link. */
  extraLines?: string[];
}): ComposedEmail {
  const email = LOAD_STATUS_EMAIL[input.next];
  const lines: (string | null)[] = [email.body];
  if (input.note) lines.push("", input.note);
  for (const extra of input.extraLines ?? []) lines.push("", extra);
  lines.push(
    "",
    `View your shipment: ${baseUrl()}/loads/${input.loadId}`,
    "",
    ...CUSTOMER_SIGNOFF,
  );
  return { to: input.to, subject: email.subject(input.reference), text: joinLines(lines) };
}

export function composeDocumentShared(input: {
  to: string;
  reference: string;
  loadId: string;
  typeLabel: string;
  note?: string | null;
}): ComposedEmail {
  return {
    to: input.to,
    subject: `New document on ${input.reference}: ${input.typeLabel}`,
    text: joinLines([
      `A new document is available for shipment ${input.reference}: ${input.typeLabel}.`,
      input.note ? `\n${input.note}` : null,
      "",
      `View or download it: ${baseUrl()}/loads/${input.loadId}`,
      "",
      ...CUSTOMER_SIGNOFF,
    ]),
  };
}

const dueDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

/** "2026-08-20" → "August 20, 2026" for email prose; raw string if unparsable. */
function prettyDate(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? dueDateFmt.format(new Date(`${iso}T12:00:00`)) : iso;
}

export function composeDelaySet(input: {
  to: string;
  reference: string;
  loadId: string;
  reason: string;
  revisedDeliveryDate?: string | null;
}): ComposedEmail {
  return {
    to: input.to,
    subject: `Delay on ${input.reference}: we are on it`,
    text: joinLines([
      `Heads up: ${input.reference} is running behind.`,
      "",
      `What happened: ${input.reason}`,
      input.revisedDeliveryDate
        ? `\nRevised delivery: ${prettyDate(input.revisedDeliveryDate)}.`
        : null,
      "",
      "We are working it and will email you the moment anything changes. Reply to this email if the new timing creates a problem on your dock and we will sort it out.",
      "",
      `View your shipment: ${baseUrl()}/loads/${input.loadId}`,
      "",
      ...CUSTOMER_SIGNOFF,
    ]),
  };
}

export function composeDelayCleared(input: {
  to: string;
  reference: string;
  loadId: string;
}): ComposedEmail {
  return {
    to: input.to,
    subject: `${input.reference} is back on schedule`,
    text: joinLines([
      `Good news: ${input.reference} is back on schedule. The earlier delay is resolved.`,
      "",
      `View your shipment: ${baseUrl()}/loads/${input.loadId}`,
      "",
      ...CUSTOMER_SIGNOFF,
    ]),
  };
}

export function composeInvoiceIssued(input: {
  to: string;
  reference: string;
  loadId: string;
  number: string;
  amountUsd: string;
  dueDate: string;
}): ComposedEmail {
  const amount = Number(input.amountUsd).toLocaleString("en-US", { minimumFractionDigits: 2 });
  return {
    to: input.to,
    subject: `Invoice ${input.number} for ${input.reference}`,
    text: joinLines([
      `Your invoice for shipment ${input.reference} is ready.`,
      "",
      `Invoice ${input.number}`,
      `Amount due: $${amount}`,
      `Due date: ${prettyDate(input.dueDate)}`,
      "",
      `View your invoice: ${baseUrl()}/loads/${input.loadId}`,
      "",
      "Reply to this email with any billing questions.",
      "",
      ...CUSTOMER_SIGNOFF,
    ]),
  };
}

export function composeCustomUpdate(input: {
  to: string;
  reference: string;
  loadId: string;
  subject: string;
  body: string;
}): ComposedEmail {
  return {
    to: input.to,
    subject: input.subject,
    text: joinLines([
      input.body,
      "",
      `View your shipment: ${baseUrl()}/loads/${input.loadId}`,
      "",
      ...CUSTOMER_SIGNOFF,
    ]),
  };
}

/** Founder/agent-path invite (Settings invites go through the Better Auth
 * plugin's own email in lib/auth.ts). Links the same /invite/[id] accept
 * page; 48 hours matches the plugin's invitation expiry. */
export function composeInviteEmail(input: {
  to: string;
  orgName: string;
  inviterName?: string | null;
  inviteId: string;
}): ComposedEmail {
  return {
    to: input.to,
    subject: `Join ${input.orgName} on Peer Freight`,
    text: joinLines([
      input.inviterName
        ? `${input.inviterName} invited you to join ${input.orgName} on the Peer Freight portal.`
        : `You are invited to join ${input.orgName} on the Peer Freight portal.`,
      "",
      "You will see the company's quotes, loads, live tracking, documents, and invoices in one place.",
      "",
      `Accept the invite here: ${baseUrl()}/invite/${input.inviteId}`,
      "",
      "The link is good for 48 hours. If you were not expecting this, you can ignore it.",
      "",
      "Peer Freight",
    ]),
  };
}

/** Re-send of the public tracking link. The URL and TTL arrive as data
 * (this file stays free of tracking imports). */
export function composeTrackingLink(input: {
  to: string;
  reference: string;
  publicUrl: string;
  ttlDays: number;
}): ComposedEmail {
  return {
    to: input.to,
    subject: `Live tracking for ${input.reference}`,
    text: joinLines([
      `Follow your freight live on a map: ${input.publicUrl}`,
      "",
      `Anyone you share the link with can watch, no login needed. It stays live until ${input.ttlDays} days after delivery.`,
      "",
      ...CUSTOMER_SIGNOFF,
    ]),
  };
}

/**
 * Desk alert for a new quote request, shared by the signed-in portal action
 * and the public guest funnel so the two can never drift. `note` is the
 * funnel marker (e.g. "New account created through the public quote page").
 */
export function composeRfqTeamAlert(input: {
  orgName: string;
  requesterName: string;
  requesterEmail: string;
  requestId: string;
  rfq: RfqInput;
  note?: string | null;
}): ComposedEmail {
  const lane = laneSummary(input.rfq);
  return {
    to: "team@peer-freight.com",
    subject: `New quote request: ${lane}`,
    text: joinLines([
      `${input.orgName} (${input.requesterName}, ${input.requesterEmail}) submitted a quote request.`,
      input.note ? `\n${input.note}` : null,
      "",
      `- Lane: ${lane}`,
      `- Pickup: ${input.rfq.pickupDate}`,
      `- Equipment: ${input.rfq.equipment}`,
      `- Commodity: ${input.rfq.commodity}`,
      `- Weight: ${input.rfq.weightLbs} lbs`,
      input.rfq.hazmat ? `- HAZMAT (${hazmatSummary(input.rfq)}): review before quoting` : null,
      "",
      `Quote it: ${baseUrl()}/admin/quotes/${input.requestId}`,
    ]),
  };
}

/** Sent once, right after the guest funnel creates the account and files
 * the first request. The quote-ready email carries the price later; this
 * one confirms both things happened and where they live. */
export function composeGuestWelcome(input: {
  to: string;
  name: string;
  requestId: string;
}): ComposedEmail {
  const first = input.name.trim().split(/\s+/)[0] || input.name;
  return {
    to: input.to,
    subject: "We received your Peer Freight quote request",
    text: joinLines([
      `Hi ${first}!`,
      "",
      "Thanks for reaching out! We received your quote request, and one of us will review it personally. We'll get back to you within an hour during business hours.",
      "",
      `View your request: ${baseUrl()}/quotes/${input.requestId}`,
      "",
      "If anything about the shipment changes, please reply to this email and let us know.",
      "",
      ...CUSTOMER_SIGNOFF,
    ]),
  };
}
