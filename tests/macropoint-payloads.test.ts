// Fixture tests for the pure MacroPoint XML build/parse functions — the
// contract file for cred-day (plan Phase 7). When the rep call delivers the
// real API docs, the fixtures here get replaced with the documented samples
// and lib/tracking/macropoint.ts is adjusted until this file is green again;
// nothing outside that file and this one should need to change.
import { describe, expect, it } from "vitest";
import { buildCreateOrderXml, parseCallback, parseOrderId } from "../lib/tracking/macropoint";
import type { StartTrackingInput } from "../lib/tracking/provider";

const input: StartTrackingInput = {
  sessionId: "sess-1",
  loadReference: "PEER-1001",
  driverPhone: "+15555550100",
  intervalMinutes: 30,
  callbackUrl: "https://peer-freight.com/api/tracking/callback/sess-1/secret-abc",
  origin: { city: "Petaluma", state: "CA", zip: "94952" },
  dest: { city: "Reno", state: "NV", zip: "89502" },
  pickupDate: "2026-08-05",
  deliveryDate: "2026-08-06",
};

describe("buildCreateOrderXml", () => {
  it("carries the reference, phone, interval, callback URL, and lane", () => {
    const xml = buildCreateOrderXml(input);
    expect(xml).toContain("<ordernumber>PEER-1001</ordernumber>");
    expect(xml).toContain("<phonenumber>+15555550100</phonenumber>");
    expect(xml).toContain("<intervalinminutes>30</intervalinminutes>");
    expect(xml).toContain(
      "<notifyurl>https://peer-freight.com/api/tracking/callback/sess-1/secret-abc</notifyurl>",
    );
    expect(xml).toContain("<city>Petaluma</city>");
    expect(xml).toContain("<city>Reno</city>");
  });

  it("escapes XML-hostile characters", () => {
    const xml = buildCreateOrderXml({
      ...input,
      loadReference: 'PEER-1001 <"beer" & ale>',
      callbackUrl: "https://peer-freight.com/cb?a=1&b=2",
    });
    expect(xml).toContain("PEER-1001 &lt;&quot;beer&quot; &amp; ale&gt;");
    expect(xml).toContain("https://peer-freight.com/cb?a=1&amp;b=2");
    expect(xml).not.toContain("a=1&b=2");
  });
});

describe("parseOrderId", () => {
  it("reads the order id out of a create-order response", () => {
    expect(
      parseOrderId(
        `<?xml version="1.0"?><createorderresponse><orderid>MP-778899</orderid></createorderresponse>`,
      ),
    ).toBe("MP-778899");
    expect(
      parseOrderId(`<response><macropointorderid>44556</macropointorderid></response>`),
    ).toBe("44556");
    expect(parseOrderId(`<response><status>error</status></response>`)).toBeNull();
  });
});

describe("parseCallback", () => {
  const update = (body: string) =>
    `<locationupdate>${body}</locationupdate>`;

  it("normalizes a single location update", () => {
    const updates = parseCallback(
      update(
        `<latitude>38.2324</latitude><longitude>-122.6367</longitude>` +
          `<city>Petaluma</city><state>CA</state>` +
          `<utcdatetime>2026-08-05T18:00:00Z</utcdatetime>` +
          `<eta>2026-08-06T20:00:00Z</eta>` +
          `<trackingstatus>InTransit</trackingstatus>` +
          `<eventid>evt-42</eventid>`,
      ),
    );
    expect(updates).toHaveLength(1);
    const ping = updates[0];
    expect(ping.kind).toBe("ping");
    if (ping.kind !== "ping") return;
    expect(ping.lat).toBe(38.2324);
    expect(ping.lng).toBe(-122.6367);
    expect(ping.city).toBe("Petaluma");
    expect(ping.state).toBe("CA");
    expect(ping.recordedAt.toISOString()).toBe("2026-08-05T18:00:00.000Z");
    expect(ping.etaAt?.toISOString()).toBe("2026-08-06T20:00:00.000Z");
    expect(ping.providerStatus).toBe("InTransit");
    expect(ping.providerEventId).toBe("evt-42");
    expect(ping.source).toBe("webhook");
  });

  it("handles a batch, skipping entries without usable coordinates", () => {
    const updates = parseCallback(
      `<notification>` +
        update(`<latitude>38.1</latitude><longitude>-122.1</longitude><utcdatetime>2026-08-05T18:00:00Z</utcdatetime>`) +
        update(`<latitude>garbage</latitude><longitude>-122.2</longitude>`) +
        update(`<latitude>38.3</latitude><longitude>-122.3</longitude><utcdatetime>2026-08-05T19:00:00Z</utcdatetime>`) +
        `</notification>`,
    );
    expect(updates.filter((u) => u.kind === "ping")).toHaveLength(2);
  });

  it("turns a coordinate-less status callback into a status update", () => {
    const updates = parseCallback(update(`<trackingstatus>DriverDeclined</trackingstatus>`));
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ kind: "status", status: "DriverDeclined" });
  });

  it("returns nothing for an empty or unrecognizable body", () => {
    expect(parseCallback("<unknown/>")).toHaveLength(0);
    expect(parseCallback("")).toHaveLength(0);
  });
});
