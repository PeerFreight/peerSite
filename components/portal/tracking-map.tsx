"use client";

import { useEffect, useMemo, useState } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";

/**
 * The live tracking map: origin/destination pins, the truck at the latest
 * ping, and the full breadcrumb polyline (total transparency — the shipper
 * sees the same trail we do). Polls `pollUrl` every 60 seconds; the endpoint
 * differs (public token route vs session-gated load route) but both answer
 * with { pings, lastPingAt, ... } in the shared serializer shape.
 *
 * Renders on the customer load page, the admin load page, and the public
 * /track/<token> page. Without NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (local dev
 * before the GCP keys exist) it degrades to a text readout of the latest
 * position so stub-mode E2E still shows movement.
 */

export type MapPing = { lat: number; lng: number; recordedAt: string };

export type TrackingMapProps = {
  originLat: number | null;
  originLng: number | null;
  destLat: number | null;
  destLng: number | null;
  pings: MapPing[];
  lastPingAt: string | null;
  /** Polled every 60s for fresh pings; null disables polling. */
  pollUrl: string | null;
  /** Map height; the load page hero passes a taller one. */
  heightClass?: string;
};

const POLL_MS = 60_000;

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

/** Breadcrumb polyline — vis.gl has no <Polyline>, so draw imperatively. */
function Breadcrumb({ pings }: { pings: MapPing[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || pings.length < 2) return;
    const line = new google.maps.Polyline({
      path: pings.map((p) => ({ lat: p.lat, lng: p.lng })),
      geodesic: true,
      strokeColor: "#1b2a4a",
      strokeOpacity: 0.85,
      strokeWeight: 3,
      map,
    });
    return () => line.setMap(null);
  }, [map, pings]);
  return null;
}

function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat},${p.lng}`).join(";");
  useEffect(() => {
    if (!map || points.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const p of points) bounds.extend(p);
    map.fitBounds(bounds, 48);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export function TrackingMap(props: TrackingMapProps) {
  const heightClass = props.heightClass ?? "h-72";
  const [pings, setPings] = useState(props.pings);
  const [lastPingAt, setLastPingAt] = useState(props.lastPingAt);

  useEffect(() => {
    if (!props.pollUrl) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(props.pollUrl!, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { pings?: MapPing[]; lastPingAt?: string | null };
        if (Array.isArray(data.pings)) setPings(data.pings);
        if (data.lastPingAt !== undefined) setLastPingAt(data.lastPingAt);
      } catch {
        // Transient poll failures are fine; the next tick retries.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [props.pollUrl]);

  const latest = pings[pings.length - 1] ?? null;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const boundsPoints = useMemo(() => {
    const pts: { lat: number; lng: number }[] = pings.map((p) => ({ lat: p.lat, lng: p.lng }));
    if (props.originLat != null && props.originLng != null)
      pts.push({ lat: props.originLat, lng: props.originLng });
    if (props.destLat != null && props.destLng != null)
      pts.push({ lat: props.destLat, lng: props.destLng });
    return pts;
  }, [pings, props.originLat, props.originLng, props.destLat, props.destLng]);

  const caption = latest ? (
    <p className="mt-2 text-xs text-muted">
      Last update: {minutesAgo(lastPingAt ?? latest.recordedAt)} min ago
    </p>
  ) : (
    <p className="mt-2 text-sm text-muted">
      Waiting for the first location ping — the map fills in once the driver&apos;s phone
      starts reporting.
    </p>
  );

  if (!apiKey) {
    return (
      <div>
        <div className={`flex ${props.heightClass ?? "h-48"} items-center justify-center rounded-lg border border-dashed border-line bg-paper px-6 text-center`}>
          <div>
            <p className="text-sm font-bold text-ink">
              {latest
                ? `Truck at ${latest.lat.toFixed(4)}, ${latest.lng.toFixed(4)} · ${pings.length} ping${pings.length === 1 ? "" : "s"} on the trail`
                : "Waiting for the first location ping…"}
            </p>
            <p className="mt-1 text-xs text-muted">
              Map view needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
            </p>
          </div>
        </div>
        {latest ? caption : null}
      </div>
    );
  }

  return (
    <div>
      <div className={`${heightClass} overflow-hidden rounded-lg border border-line`}>
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={
              latest
                ? { lat: latest.lat, lng: latest.lng }
                : { lat: props.originLat ?? 39.5, lng: props.originLng ?? -98.35 }
            }
            defaultZoom={latest ? 8 : 4}
            gestureHandling="cooperative"
            disableDefaultUI={false}
            streetViewControl={false}
            mapTypeControl={false}
          >
            {props.originLat != null && props.originLng != null ? (
              <Marker
                position={{ lat: props.originLat, lng: props.originLng }}
                label={{ text: "A", color: "#ffffff", fontWeight: "700" }}
                title="Pickup"
              />
            ) : null}
            {props.destLat != null && props.destLng != null ? (
              <Marker
                position={{ lat: props.destLat, lng: props.destLng }}
                label={{ text: "B", color: "#ffffff", fontWeight: "700" }}
                title="Delivery"
              />
            ) : null}
            {latest ? (
              <Marker
                position={{ lat: latest.lat, lng: latest.lng }}
                title="Current position"
                zIndex={10}
                icon={{
                  path: "M -8 0 A 8 8 0 1 0 8 0 A 8 8 0 1 0 -8 0",
                  fillColor: "#d4a017",
                  fillOpacity: 1,
                  strokeColor: "#1b2a4a",
                  strokeWeight: 2.5,
                }}
              />
            ) : null}
            <Breadcrumb pings={pings} />
            {boundsPoints.length > 0 ? <FitBounds points={boundsPoints} /> : null}
          </Map>
        </APIProvider>
      </div>
      {caption}
    </div>
  );
}
