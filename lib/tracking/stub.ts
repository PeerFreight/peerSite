import type { CallbackUpdate, StartTrackingInput, TrackingProvider } from "@/lib/tracking/provider";

/**
 * No-network provider for local dev, demos, and CI. startTracking succeeds
 * instantly; pings arrive by POSTing JSON to the real webhook route (see
 * scripts/track-sim.ts), so the whole pipeline downstream of the provider —
 * webhook auth, idempotency, map, public link — is exercised for real.
 *
 * Callback body: { "pings": [{ "lat": 38.2, "lng": -122.6,
 *   "recordedAt": "2026-08-01T18:00:00Z", "city"?, "state"?, "etaAt"?,
 *   "providerStatus"?, "providerEventId"? }] }
 */
export class StubProvider implements TrackingProvider {
  readonly name = "stub" as const;

  async startTracking(input: StartTrackingInput) {
    return { externalOrderId: `stub-${input.sessionId}` };
  }

  async stopTracking(_externalOrderId: string) {}

  parseCallback(body: string): CallbackUpdate[] {
    const parsed = JSON.parse(body) as {
      pings?: {
        lat: number;
        lng: number;
        recordedAt: string;
        city?: string;
        state?: string;
        etaAt?: string;
        providerStatus?: string;
        providerEventId?: string;
      }[];
    };
    return (parsed.pings ?? [])
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => ({
        kind: "ping" as const,
        lat: p.lat,
        lng: p.lng,
        recordedAt: new Date(p.recordedAt),
        city: p.city ?? null,
        state: p.state ?? null,
        etaAt: p.etaAt ? new Date(p.etaAt) : null,
        providerStatus: p.providerStatus ?? null,
        providerEventId: p.providerEventId ?? null,
        source: "sim" as const,
      }))
      .filter((p) => !Number.isNaN(p.recordedAt.getTime()));
  }
}
