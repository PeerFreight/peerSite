// Drive a fake truck for stub-mode tracking: interpolates points between
// --from and --to and POSTs them, one per tick, to a tracking callback URL in
// the stub provider's JSON format — exercising the real webhook route, ping
// idempotency, and the live map on localhost.
//
// Get the callback URL from the admin load page's tracking panel, then:
//   node scripts/track-sim.ts <callback-url> \
//     --from 38.23,-122.63 --to 39.52,-119.81 --interval 10 --steps 20
//
// Each tick also re-sends the previous ping (same providerEventId) so you can
// watch the dedupe hold: `recorded` stays 1 per tick.

function fail(msg: string): never {
  console.error(msg);
  console.error(
    "usage: node scripts/track-sim.ts <callback-url> --from <lat,lng> --to <lat,lng> [--interval seconds] [--steps n]",
  );
  process.exit(1);
}

function parseLatLng(name: string, value: string | undefined): { lat: number; lng: number } {
  if (!value) fail(`missing --${name}`);
  const [lat, lng] = value.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) fail(`--${name} must be lat,lng`);
  return { lat, lng };
}

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--")) ?? fail("missing callback URL");
function flag(name: string) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
}

const from = parseLatLng("from", flag("from"));
const to = parseLatLng("to", flag("to"));
const intervalSeconds = Number(flag("interval") ?? 10);
const steps = Number(flag("steps") ?? 20);

let i = 0;
async function tick() {
  const t = Math.min(i / steps, 1);
  // A touch of jitter so the trail looks like a road, not a ruler.
  const jitter = i === 0 || t === 1 ? 0 : (Math.random() - 0.5) * 0.02;
  const ping = {
    lat: from.lat + (to.lat - from.lat) * t + jitter,
    lng: from.lng + (to.lng - from.lng) * t + jitter,
    recordedAt: new Date().toISOString(),
    providerStatus: t === 1 ? "arrived" : "in_transit",
    providerEventId: `sim-${i}`,
  };
  // Previous ping re-sent alongside: proves webhook idempotency live.
  const pings = i === 0 ? [ping] : [{ ...lastPing! }, ping];
  lastPing = ping;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pings }),
    });
    const body = await res.text();
    console.log(
      `[${i}/${steps}] ${ping.lat.toFixed(4)},${ping.lng.toFixed(4)} -> ${res.status} ${body}`,
    );
  } catch (err) {
    console.error(`[${i}/${steps}] POST failed:`, err);
  }
  if (t >= 1) {
    console.log("arrived — simulation done");
    process.exit(0);
  }
  i += 1;
  setTimeout(tick, intervalSeconds * 1000);
}

let lastPing: { lat: number; lng: number; recordedAt: string; providerStatus: string; providerEventId: string } | null =
  null;
console.log(`simulating ${steps} pings every ${intervalSeconds}s -> ${url}`);
void tick();
