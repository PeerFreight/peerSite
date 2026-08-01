import type { TrackingProviderName } from "@/db/schema";
import { MacroPointProvider } from "@/lib/tracking/macropoint";
import type { TrackingProvider } from "@/lib/tracking/provider";
import { StubProvider } from "@/lib/tracking/stub";

const providers: Record<TrackingProviderName, TrackingProvider> = {
  macropoint: new MacroPointProvider(),
  stub: new StubProvider(),
};

/**
 * Without a name: the provider for NEW sessions — MacroPoint once
 * PORTAL_MACROPOINT_ID exists (env-switch, like getStorage()), stub before.
 * With a name: the provider a stored session was created with, so the webhook
 * route keeps parsing old stub sessions correctly after credentials land.
 */
export function getTrackingProvider(name?: TrackingProviderName): TrackingProvider {
  if (name) return providers[name];
  return process.env.PORTAL_MACROPOINT_ID ? providers.macropoint : providers.stub;
}
