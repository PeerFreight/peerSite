import type {
  CallbackUpdate,
  NormalizedPing,
  StartTrackingInput,
  TrackingProvider,
} from "@/lib/tracking/provider";

/**
 * MacroPoint Lite adapter (https://macropoint-lite.com/api/1.0/, Basic auth,
 * XML in and out). The payload shapes below follow the public references for
 * the Lite API and are UNVERIFIED until the rep call delivers the real docs
 * (plan Phase 7) — which is why every payload is built and parsed by the
 * exported pure functions with fixture tests (tests/macropoint-payloads.test.ts).
 * Cred-day is a fixture-driven diff to this file only: no schema, domain, or
 * UI churn.
 *
 * No XML dependency: we emit strings and parse with targeted regexes over a
 * flat, known element vocabulary. If the real payloads turn out nested enough
 * to defeat that, this file grows a tiny parser — still contained here.
 */

const DEFAULT_BASE_URL = "https://macropoint-lite.com/api/1.0";

function esc(v: string) {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** First <tag>…</tag> text content, entity-decoded; null when absent. */
function tagText(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return null;
  const text = m[1].trim();
  if (!text) return null;
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");
}

/** Create-order request: track a load by the driver's cell number, asking for
 * location updates every `intervalMinutes` to our callback URL. */
export function buildCreateOrderXml(input: StartTrackingInput): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<createorder>`,
    `  <ordernumber>${esc(input.loadReference)}</ordernumber>`,
    `  <trackdurationandinterval>`,
    `    <intervalinminutes>${input.intervalMinutes}</intervalinminutes>`,
    `  </trackdurationandinterval>`,
    `  <notifications>`,
    `    <notification>`,
    `      <partnermptype>LocationUpdate</partnermptype>`,
    `      <notifyurl>${esc(input.callbackUrl)}</notifyurl>`,
    `    </notification>`,
    `  </notifications>`,
    `  <trackvia>`,
    `    <phonenumber>${esc(input.driverPhone)}</phonenumber>`,
    `  </trackvia>`,
    `  <trackstartdatetime>${esc(input.pickupDate)}</trackstartdatetime>`,
    `  <trackenddatetime>${esc(input.deliveryDate)}</trackenddatetime>`,
    `  <origin><city>${esc(input.origin.city)}</city><state>${esc(input.origin.state)}</state><zip>${esc(input.origin.zip)}</zip></origin>`,
    `  <destination><city>${esc(input.dest.city)}</city><state>${esc(input.dest.state)}</state><zip>${esc(input.dest.zip)}</zip></destination>`,
    `</createorder>`,
  ].join("\n");
}

/** Order id out of the create-order response; null when unrecognizable. */
export function parseOrderId(xml: string): string | null {
  return tagText(xml, "orderid") ?? tagText(xml, "macropointorderid");
}

/** Normalize a location-update callback. Tolerates one update or a list;
 * skips entries without usable coordinates rather than failing the batch. */
export function parseCallback(body: string): CallbackUpdate[] {
  const blocks = body.match(/<locationupdate[^>]*>[\s\S]*?<\/locationupdate>/gi) ?? [
    body,
  ];
  const updates: CallbackUpdate[] = [];
  for (const block of blocks) {
    const lat = Number(tagText(block, "latitude"));
    const lng = Number(tagText(block, "longitude"));
    const status = tagText(block, "trackingstatus") ?? tagText(block, "status");
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      const recorded = tagText(block, "utcdatetime") ?? tagText(block, "datetime");
      const recordedAt = recorded ? new Date(recorded) : new Date();
      const eta = tagText(block, "eta");
      const ping: NormalizedPing = {
        kind: "ping",
        lat,
        lng,
        recordedAt: Number.isNaN(recordedAt.getTime()) ? new Date() : recordedAt,
        city: tagText(block, "city"),
        state: tagText(block, "state"),
        etaAt: eta ? new Date(eta) : null,
        providerStatus: status,
        providerEventId: tagText(block, "eventid") ?? tagText(block, "updateid"),
        source: "webhook",
      };
      if (ping.etaAt && Number.isNaN(ping.etaAt.getTime())) ping.etaAt = null;
      updates.push(ping);
    } else if (status) {
      updates.push({ kind: "status", status, at: new Date() });
    }
  }
  return updates;
}

export class MacroPointProvider implements TrackingProvider {
  readonly name = "macropoint" as const;

  private get baseUrl() {
    return process.env.PORTAL_MACROPOINT_BASE_URL ?? DEFAULT_BASE_URL;
  }

  private get authHeader() {
    const id = process.env.PORTAL_MACROPOINT_ID;
    const password = process.env.PORTAL_MACROPOINT_PASSWORD;
    if (!id || !password) throw new Error("MacroPoint credentials are not configured");
    return `Basic ${Buffer.from(`${id}:${password}`).toString("base64")}`;
  }

  private async request(path: string, body?: string) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "text/xml",
      },
      body,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`MacroPoint ${path} failed: ${res.status} ${text.slice(0, 300)}`);
    }
    return text;
  }

  async startTracking(input: StartTrackingInput) {
    const response = await this.request("/orders/createorder", buildCreateOrderXml(input));
    const externalOrderId = parseOrderId(response);
    if (!externalOrderId) {
      throw new Error(`MacroPoint create-order response had no order id: ${response.slice(0, 300)}`);
    }
    return { externalOrderId };
  }

  async stopTracking(externalOrderId: string) {
    await this.request(`/orders/${encodeURIComponent(externalOrderId)}/stop`);
  }

  parseCallback(body: string): CallbackUpdate[] {
    return parseCallback(body);
  }
}
