import { sendEmail } from "@/lib/email";
import { LOAD_STATUS_EMAIL } from "@/lib/portal/loads";
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
      `Your quote is ready: $${rate} all-in.`,
      "",
      input.serviceDescription,
      input.exclusions ? `\nNot included: ${input.exclusions}` : null,
      input.validUntil ? `\nThis quote is valid through ${input.validUntil}.` : null,
      input.note ? `\nHow we priced it: ${input.note}` : null,
      "",
      `Review it here: ${baseUrl()}/quotes/${input.requestId}`,
      "",
      "Reply to this email to move forward or ask anything.",
      "",
      "Peer Freight",
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
      "To finish pricing your quote request, we need a few more details:",
      "",
      input.message,
      "",
      `You can reply to this email, or update us here: ${baseUrl()}/quotes/${input.requestId}`,
      "",
      "Peer Freight",
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
    subject: `Your load is booked: ${input.reference}`,
    text: joinLines([
      `Your load is booked. Reference ${input.reference} — quote it in any message about this shipment.`,
      "",
      "We are sourcing and vetting the carrier now. You will get an email when a carrier is dispatched, and its contact details will be on your load page.",
      "",
      "Once the truck is rolling you will also get a live tracking link — a map you can watch (and share) without logging in.",
      "",
      `Track it here: ${baseUrl()}/loads/${input.loadId}`,
      "",
      "Peer Freight",
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
  lines.push("", `Load page: ${baseUrl()}/loads/${input.loadId}`, "", "Peer Freight");
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
      `A new document is posted on load ${input.reference}: ${input.typeLabel}.`,
      input.note ? `\n${input.note}` : null,
      "",
      `Download it from your load page: ${baseUrl()}/loads/${input.loadId}`,
      "",
      "Peer Freight",
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
      `Load page: ${baseUrl()}/loads/${input.loadId}`,
      "",
      "Peer Freight",
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
      `Load page: ${baseUrl()}/loads/${input.loadId}`,
      "",
      "Peer Freight",
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
      `Your invoice for load ${input.reference} is ready.`,
      "",
      `Invoice ${input.number}`,
      `Amount due: $${amount}`,
      `Due date: ${prettyDate(input.dueDate)}`,
      "",
      `View it (and the load's documents) here: ${baseUrl()}/loads/${input.loadId}`,
      "",
      "Reply to this email with any billing questions.",
      "",
      "Peer Freight",
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
      `Load page: ${baseUrl()}/loads/${input.loadId}`,
      "",
      "Peer Freight",
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
