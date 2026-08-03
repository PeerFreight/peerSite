// The tracking and invitation CLI commands end to end against PGlite: a
// booked load gains a stub tracking session, pings land and flip it active,
// the public link emails/rotates/dies correctly, and a pending invite can be
// canceled by email or id — all with via:"agent" provenance where logged.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { resolveActor, resolveLoad, runCommand } from "../lib/portal/cli";
import type { AdminUser } from "../lib/portal/admin-queries";
import { createQuoteRequest, getPublicTracking, type PortalDb } from "../lib/portal/queries";
import type { RfqInput } from "../lib/portal/rfq";

let db: PortalDb;
let raw: ReturnType<typeof drizzle<typeof schema>>;
let agent: AdminUser;
let reference: string;

function rfq(): RfqInput {
  return {
    originAddress: null,
    originCity: "Petaluma",
    originState: "CA",
    originZip: "94952",
    originHours: null,
    originScheduling: "fcfs",
    destAddress: null,
    destCity: "Reno",
    destState: "NV",
    destZip: "89502",
    destHours: null,
    destScheduling: "appointment",
    pickupDate: "2026-08-05",
    pickupWindow: null,
    deliveryDate: "2026-08-06",
    deliveryWindow: null,
    dateFlexibility: "exact",
    commodity: "Packaged beer, cases on pallets",
    weightLbs: 38000,
    pieces: "26 pallets",
    dims: null,
    declaredValueUsd: null,
    equipment: "dry_van_53",
    temperatureF: null,
    equipmentNotes: null,
    hazmat: false,
    hazmatDetails: null,
    accessorials: [],
    referenceNumbers: [],
    targetRateUsd: null,
    frequency: "one_time",
    notes: null,
  };
}

beforeAll(async () => {
  // Force the no-network paths: stub tracking provider, no geocoding.
  delete process.env.PORTAL_MACROPOINT_ID;
  delete process.env.PORTAL_GMAPS_SERVER_KEY;

  const client = new PGlite();
  const dir = join(__dirname, "..", "db", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(dir, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await client.exec(statement);
    }
  }
  raw = drizzle(client, { schema });
  db = raw as unknown as PortalDb;

  await raw.insert(schema.user).values([
    { id: "user-a", name: "Dana", email: "dana@shipper-a.com", emailVerified: true },
    { id: "user-admin", name: "Aaron", email: "aaron@peer-freight.com", emailVerified: true },
  ]);
  await raw.insert(schema.organization).values([
    { id: "org-a", name: "North Coast Brewing", slug: "north-coast" },
  ]);
  await raw.insert(schema.member).values([
    { id: "m-a", organizationId: "org-a", userId: "user-a", role: "owner" },
  ]);

  agent = await resolveActor(db, "aaron@peer-freight.com");
  const rfqId = await createQuoteRequest(db, "user-a", "org-a", rfq());
  const quote = await runCommand(db, agent, [
    "send-quote",
    rfqId,
    "--rate",
    "1850",
    "--service",
    "Dry van 53', door to door.",
  ]);
  const booked = await runCommand(db, agent, ["book", (quote.json as { quoteId: string }).quoteId]);
  reference = (booked.json as { reference: string }).reference;
});

describe("start-tracking", () => {
  it("refuses without a carrier driver phone, then starts via the stub provider", async () => {
    await expect(runCommand(db, agent, ["start-tracking", reference])).rejects.toThrow(
      /driver phone/,
    );

    await runCommand(db, agent, [
      "assign-carrier",
      reference,
      "--name",
      "Redwood Haulage LLC",
      "--driver",
      "R. Alvarez",
      "--phone",
      "(555) 555-0100",
    ]);
    await expect(runCommand(db, agent, ["start-tracking", reference, "--interval", "3"])).rejects.toThrow(
      /5-240/,
    );

    const result = await runCommand(db, agent, ["start-tracking", reference]);
    expect(result.text).toContain("/track/");
    const data = result.json as { sessionId: string; publicToken: string; provider: string };
    expect(data.provider).toBe("stub");

    const detail = await resolveLoad(db, agent, reference);
    const started = detail.events.find((e) => e.eventType === "tracking_started");
    expect(started?.payload).toMatchObject({ via: "agent", intervalMinutes: 30 });

    await expect(runCommand(db, agent, ["start-tracking", reference])).rejects.toThrow(
      /already has a live tracking session/,
    );
  });
});

describe("record-ping", () => {
  it("validates coordinates, records the ping, and flips the session active", async () => {
    await expect(
      runCommand(db, agent, ["record-ping", reference, "--lat", "123", "--lng", "-122"]),
    ).rejects.toThrow(/--lat/);

    const result = await runCommand(db, agent, [
      "record-ping",
      reference,
      "--lat",
      "38.24",
      "--lng",
      "-122.04",
      "--city",
      "Fairfield",
      "--state",
      "CA",
      "--eta",
      "2026-08-06T21:00:00Z",
    ]);
    expect((result.json as { inserted: boolean }).inserted).toBe(true);

    const sessions = await raw.select().from(schema.trackingSessions);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].status).toBe("active");
    const pings = await raw.select().from(schema.locationPings);
    expect(pings).toHaveLength(1);
    expect(pings[0].source).toBe("manual");
    expect(pings[0].city).toBe("Fairfield");
    expect(pings[0].etaAt).not.toBeNull();
  });
});

describe("send-link and revoke-link", () => {
  it("emails the shipper the live link and logs it on the timeline", async () => {
    const result = await runCommand(db, agent, ["send-link", reference]);
    expect(result.emails).toHaveLength(1);
    expect(result.emails[0].to).toBe("dana@shipper-a.com");
    expect(result.emails[0].subject).toBe(`Live tracking for ${reference}`);
    expect(result.emails[0].text).toContain("/track/");

    const detail = await resolveLoad(db, agent, reference);
    const sent = detail.events.find((e) => e.eventType === "tracking_link_sent");
    expect(sent?.payload).toMatchObject({ via: "agent", to: "dana@shipper-a.com" });
  });

  it("rotates the token: the old public link dies, the fresh one serves", async () => {
    const before = (await raw.select().from(schema.trackingSessions))[0];
    expect(await getPublicTracking(db, before.publicToken)).not.toBeNull();

    const result = await runCommand(db, agent, ["revoke-link", reference]);
    const fresh = (result.json as { publicToken: string }).publicToken;
    expect(fresh).not.toBe(before.publicToken);
    expect(await getPublicTracking(db, before.publicToken)).toBeNull();
    expect(await getPublicTracking(db, fresh)).not.toBeNull();
  });
});

describe("stop-tracking", () => {
  it("stops the session; send-link then refuses", async () => {
    await runCommand(db, agent, ["stop-tracking", reference]);
    const session = (await raw.select().from(schema.trackingSessions))[0];
    expect(session.status).toBe("stopped");
    await expect(runCommand(db, agent, ["send-link", reference])).rejects.toThrow(
      /No live tracking session/,
    );
    await expect(runCommand(db, agent, ["stop-tracking", reference])).rejects.toThrow(
      /No live tracking session/,
    );
  });
});

describe("cancel-invite", () => {
  it("cancels a pending invitation by email; the row matches the Better Auth cancel shape", async () => {
    await runCommand(db, agent, ["invite", "ops@shipper-a.com", "--org", "north-coast"]);
    const result = await runCommand(db, agent, ["cancel-invite", "ops@shipper-a.com"]);
    expect(result.text).toContain("ops@shipper-a.com");
    expect(result.text).toContain("North Coast Brewing");

    const rows = await raw
      .select()
      .from(schema.invitation)
      .where(eq(schema.invitation.email, "ops@shipper-a.com"));
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("canceled");

    const events = await raw
      .select()
      .from(schema.events)
      .where(eq(schema.events.eventType, "teammate_invite_cancelled"));
    expect(events).toHaveLength(1);
    expect(events[0].payload).toMatchObject({ via: "agent", email: "ops@shipper-a.com" });

    await expect(runCommand(db, agent, ["cancel-invite", "ops@shipper-a.com"])).rejects.toThrow(
      /No invitation matching/,
    );
  });

  it("cancels by invitation id and refuses a second cancel", async () => {
    const invited = await runCommand(db, agent, ["invite", "dock@shipper-a.com", "--org", "north-coast"]);
    const invitationId = (invited.json as { invitationId: string }).invitationId;
    await runCommand(db, agent, ["cancel-invite", invitationId]);
    await expect(runCommand(db, agent, ["cancel-invite", invitationId])).rejects.toThrow(
      /already canceled/,
    );
  });
});
