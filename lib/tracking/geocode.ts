/**
 * Best-effort geocode of a city/state/zip through the Google Geocoding API
 * (server key, PORTAL_GMAPS_SERVER_KEY — never the browser key). Tracking
 * works fine without it: callers treat null as "no pin", so a missing key,
 * quota trouble, or a network blip can never block starting a session.
 */
export async function geocodeCityStateZip(
  city: string,
  state: string,
  zip: string,
): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.PORTAL_GMAPS_SERVER_KEY;
  if (!key) return null;
  try {
    const address = `${city}, ${state} ${zip}, USA`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: { geometry?: { location?: { lat: number; lng: number } } }[];
    };
    const location = data.results?.[0]?.geometry?.location;
    if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return null;
    return { lat: location.lat, lng: location.lng };
  } catch (err) {
    console.error("geocode failed", err);
    return null;
  }
}
