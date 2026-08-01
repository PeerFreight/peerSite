import type { PingSource, TrackingProviderName } from "@/db/schema";

/**
 * Provider abstraction for live load tracking. One live implementation
 * (MacroPoint Lite) plus a no-network stub for local dev, chosen by env in
 * index.ts — same shape as getStorage() in lib/storage.ts. The webhook route
 * parses with the *session's* provider, so stub sessions keep working after
 * real credentials land.
 */

export type StartTrackingInput = {
  sessionId: string;
  /** PEER-nnnn — what the driver and the MacroPoint rep see. */
  loadReference: string;
  /** E.164, already normalized (lib/portal/tracking.ts). */
  driverPhone: string;
  intervalMinutes: number;
  /** Absolute URL the provider must POST updates to. */
  callbackUrl: string;
  origin: { city: string; state: string; zip: string };
  dest: { city: string; state: string; zip: string };
  pickupDate: string;
  deliveryDate: string;
};

export type NormalizedPing = {
  kind: "ping";
  lat: number;
  lng: number;
  /** When the truck was there, per the provider. */
  recordedAt: Date;
  city: string | null;
  state: string | null;
  etaAt: Date | null;
  providerStatus: string | null;
  /** Provider's update id when it sends one — drives idempotency. */
  providerEventId: string | null;
  source: PingSource;
};

export type NormalizedStatusUpdate = {
  kind: "status";
  status: string;
  at: Date;
};

export type CallbackUpdate = NormalizedPing | NormalizedStatusUpdate;

export interface TrackingProvider {
  readonly name: TrackingProviderName;
  /** Create the tracking order; the returned id is what stopTracking takes. */
  startTracking(input: StartTrackingInput): Promise<{ externalOrderId: string }>;
  stopTracking(externalOrderId: string): Promise<void>;
  /** Turn a raw webhook body into normalized updates. Throws on garbage; the
   * webhook route catches and still answers 200 (no retry storms). */
  parseCallback(body: string, contentType: string): CallbackUpdate[];
}
