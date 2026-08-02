// The agent command layer end to end against PGlite: actor resolution
// proves the founder role, mutations land with via:"agent" in the event
// payload, PEER refs resolve, the composed client email comes back to the
// caller, and command errors surface as plain errors.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { resolveActor, resolveLoad, runCommand } from "../lib/portal/cli";
import type { AdminUser } from "../lib/portal/admin-queries";
import { createQuoteRequest, type PortalDb } from "../lib/portal/queries";
import type { RfqInput } from "../lib/portal/rfq";

let db: PortalDb;
let raw: ReturnType<typeof drizzle<typeof schema>>;
let agent: AdminUser;
let rfqId: string;

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
    { id: "user-admin", name: "Aaron", email: "admin@peer-freight.com", emailVerified: true },
    { id: "user-unverified", name: "New", email: "new@peer-freight.com", emailVerified: false },
  ]);
  await raw.insert(schema.organization).values([
    { id: "org-a", name: "North Coast Brewing", slug: "north-coast" },
  ]);
  await raw.insert(schema.member).values([
    { id: "m-a", organizationId: "org-a", userId: "user-a", role: "owner" },
  ]);

  agent = await resolveActor(db, "admin@peer-freight.com");
  rfqId = await createQuoteRequest(db, "user-a", "org-a", rfq());
});

describe("resolveActor", () => {
  it("stamps via:agent on a verified founder and rejects everyone else", async () => {
    expect(agent.via).toBe("agent");
    await expect(resolveActor(db, "dana@shipper-a.com")).rejects.toThrow(/Admin only/);
    await expect(resolveActor(db, "new@peer-freight.com")).rejects.toThrow(/Admin only/);
    await expect(resolveActor(db, "ghost@peer-freight.com")).rejects.toThrow(/No portal account/);
  });
});

describe("quote → book → status via commands", () => {
  let quoteId: string;
  let reference: string;

  it("send-quote writes the quote, notes the event via:agent, and returns the composed email", async () => {
    const result = await runCommand(db, agent, [
      "send-quote",
      rfqId,
      "--rate",
      "1850",
      "--service",
      "Dry van 53', door to door.",
      "--note",
      "Priced off 3 recent lane comps",
    ]);
    const data = result.json as { quoteId: string };
    quoteId = data.quoteId;
    expect(quoteId).toBeTruthy();
    expect(result.emails).toHaveLength(1);
    expect(result.emails[0].to).toBe("dana@shipper-a.com");
    expect(result.emails[0].text).toContain("How we priced it: Priced off 3 recent lane comps");

    const events = await raw
      .select()
      .from(schema.events)
      .where(eq(schema.events.eventType, "quote_sent"));
    expect(events).toHaveLength(1);
    expect(events[0].payload).toMatchObject({
      via: "agent",
      note: "Priced off 3 recent lane comps",
    });
    expect(events[0].actorId).toBe("user-admin");
  });

  it("book creates the load and PEER refs resolve in every spelling", async () => {
    const result = await runCommand(db, agent, ["book", quoteId]);
    const data = result.json as { reference: string; loadId: string };
    reference = data.reference;
    expect(reference).toMatch(/^PEER-\d{4,}$/);
    expect(result.emails[0].subject).toContain(reference);

    const n = reference.split("-")[1];
    for (const spelling of [reference, reference.toLowerCase(), `peer${n}`, n, data.loadId]) {
      const detail = await resolveLoad(db, agent, spelling);
      expect(detail.load.id).toBe(data.loadId);
    }
    await expect(resolveLoad(db, agent, "PEER-999999")).rejects.toThrow(/No load/);
  });

  it("set-status enforces the machine and carries the note into payload and email", async () => {
    await expect(runCommand(db, agent, ["set-status", reference, "delivered"])).rejects.toThrow(
      /booked load cannot move to delivered/,
    );
    await expect(runCommand(db, agent, ["set-status", reference, "flying"])).rejects.toThrow(
      /Unknown status/,
    );
    const result = await runCommand(db, agent, [
      "set-status",
      reference,
      "dispatched",
      "--note",
      "Truck loads first thing tomorrow.",
    ]);
    expect(result.emails[0].text).toContain("Truck loads first thing tomorrow.");
    const detail = await resolveLoad(db, agent, reference);
    expect(detail.load.status).toBe("dispatched");
    const dispatched = detail.events.find((e) => e.eventType === "load_dispatched");
    expect(dispatched?.payload).toMatchObject({ via: "agent", note: "Truck loads first thing tomorrow." });
  });

  it("delay, update, invoice, and paid all flow through with via:agent", async () => {
    await runCommand(db, agent, ["set-status", reference, "in_transit"]);
    const delay = await runCommand(db, agent, [
      "set-delay",
      reference,
      "--reason",
      "Breakdown near Sacramento",
      "--new-eta",
      "2026-08-09",
    ]);
    expect(delay.emails[0].text).toContain("Breakdown near Sacramento");

    const update = await runCommand(db, agent, [
      "send-update",
      reference,
      "--subject",
      "Quick update",
      "--body",
      "Replacement tractor is 40 minutes out.",
    ]);
    expect(update.emails[0].subject).toBe("Quick update");

    await runCommand(db, agent, ["clear-delay", reference]);
    await runCommand(db, agent, ["set-status", reference, "delivered"]);

    const invoice = await runCommand(db, agent, [
      "create-invoice",
      reference,
      "--due",
      "2026-09-05",
    ]);
    const inv = invoice.json as { number: string; amountUsd: string };
    expect(inv.number).toMatch(/^INV-\d{4,}$/);
    expect(inv.amountUsd).toBe("1850.00");
    expect(invoice.emails[0].subject).toContain(inv.number);

    const paid = await runCommand(db, agent, ["mark-paid", inv.number]);
    expect(paid.text).toContain("marked paid");

    const detail = await resolveLoad(db, agent, reference);
    expect(detail.load.status).toBe("invoiced");
    for (const type of ["load_delayed", "update_sent", "invoice_created", "invoice_paid"]) {
      const event = detail.events.find((e) => e.eventType === type);
      expect(event?.payload, type).toMatchObject({ via: "agent" });
    }
  });

  it("invite resolves the org by slug and reads back in the pending list", async () => {
    const result = await runCommand(db, agent, [
      "invite",
      "ops@customer.com",
      "--org",
      "north-coast",
    ]);
    expect(result.emails[0].to).toBe("ops@customer.com");
    expect(result.emails[0].text).toContain("/invite/");
    await expect(
      runCommand(db, agent, ["invite", "x@y.com", "--org", "nope"]),
    ).rejects.toThrow(/No organization/);
  });

  it("unknown commands and non-admin actors fail plainly", async () => {
    await expect(runCommand(db, agent, ["frobnicate"])).rejects.toThrow(/Unknown command/);
    const shipper: AdminUser = { id: "user-a", email: "dana@shipper-a.com", emailVerified: true };
    await expect(runCommand(db, shipper, ["loads"])).rejects.toThrow(/Admin only/);
  });
});
