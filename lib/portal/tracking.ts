import { baseUrl } from "@/lib/portal/urls";

/**
 * Pure tracking domain helpers, shared by the query layers, the webhook
 * route, the pages, and the polling endpoints. No database access here.
 */

/** Public tracking links die this long after delivery. */
export const PUBLIC_LINK_TTL_DAYS = 7;

/**
 * Normalize a driver phone to E.164, HARD-failing anything ambiguous — a bad
 * driver number is the likeliest way tracking silently never starts, so the
 * admin gets a form error instead of a dead session. Accepts US 10-digit
 * numbers (with any punctuation), 11 digits starting with 1, or an explicit
 * +country form.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (hasPlus) {
    if (digits.length < 8 || digits.length > 15) {
      throw new Error("Phone number must be 8-15 digits after the +");
    }
    return `+${digits}`;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  throw new Error(
    "Enter a full US driver cell (10 digits) or an international number starting with +",
  );
}

export type PublicLinkFields = {
  publicExpiresAt: Date | null;
};

/** A link someone holds is live until its (delivery-set) expiry passes.
 * Revocation works by token rotation, so a revoked token misses the lookup
 * entirely and never reaches this check. */
export function isPublicLinkLive(session: PublicLinkFields, now = new Date()): boolean {
  return !session.publicExpiresAt || session.publicExpiresAt.getTime() > now.getTime();
}

export function trackingPublicUrl(token: string): string {
  return `${baseUrl()}/track/${token}`;
}

export const TRACKING_INTERVAL_OPTIONS = [15, 30, 60] as const;

/** Load statuses during which a tracking session may be started. */
export const TRACKABLE_LOAD_STATUSES = ["booked", "dispatched", "in_transit"] as const;

export type SerializedPing = {
  lat: number;
  lng: number;
  recordedAt: string;
};

export type PublicTrackingPayload = {
  reference: string;
  loadStatus: string;
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
  originLat: number | null;
  originLng: number | null;
  destLat: number | null;
  destLng: number | null;
  etaAt: string | null;
  lastPingAt: string | null;
  pings: SerializedPing[];
};

/**
 * The narrow public projection behind /track/<token> — held by anyone with
 * the link, no login. NEVER add address lines, driver name or phone, rates,
 * commodity details, or org identifiers here; tests/tracking.test.ts pins the
 * exact key set so an accidental widening fails CI.
 */
export function serializePublicTracking(input: {
  load: { reference: string; status: string; originCity: string; originState: string; destCity: string; destState: string };
  session: {
    originLat: number | null;
    originLng: number | null;
    destLat: number | null;
    destLng: number | null;
    lastPingAt: Date | null;
  };
  pings: { lat: number; lng: number; recordedAt: Date; etaAt: Date | null }[];
}): PublicTrackingPayload {
  const latest = input.pings[input.pings.length - 1] ?? null;
  return {
    reference: input.load.reference,
    loadStatus: input.load.status,
    originCity: input.load.originCity,
    originState: input.load.originState,
    destCity: input.load.destCity,
    destState: input.load.destState,
    originLat: input.session.originLat,
    originLng: input.session.originLng,
    destLat: input.session.destLat,
    destLng: input.session.destLng,
    etaAt: latest?.etaAt?.toISOString() ?? null,
    lastPingAt: input.session.lastPingAt?.toISOString() ?? null,
    pings: input.pings.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      recordedAt: p.recordedAt.toISOString(),
    })),
  };
}
