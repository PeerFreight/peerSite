// The compose functions are the one place client email bodies live; these
// pin the fields that must appear (and the founder note weaving) so the web
// actions and the CLI can never drift apart.
import { describe, expect, it } from "vitest";
import {
  composeCustomUpdate,
  composeDelayCleared,
  composeDelaySet,
  composeDocumentShared,
  composeInviteEmail,
  composeInvoiceIssued,
  composeLoadBooked,
  composeLoadStatus,
  composeNeedsInfo,
  composeQuoteSent,
} from "../lib/portal/notify";

describe("composeQuoteSent", () => {
  it("carries rate, service, exclusions, validity, and the pricing note", () => {
    const email = composeQuoteSent({
      to: "dana@shipper.com",
      requestId: "rfq-1",
      allInRateUsd: "1850",
      serviceDescription: "Dry van 53', door to door.",
      exclusions: "Detention after 2h $75/h",
      validUntil: "2026-08-04",
      note: "Priced off 3 recent lane comps.",
    });
    expect(email.to).toBe("dana@shipper.com");
    expect(email.subject).toBe("Your Peer Freight quote is ready");
    expect(email.text).toContain("$1,850.00 all-in");
    expect(email.text).toContain("Dry van 53', door to door.");
    expect(email.text).toContain("Not included: Detention after 2h $75/h");
    expect(email.text).toContain("valid through 2026-08-04");
    expect(email.text).toContain("How we priced it: Priced off 3 recent lane comps.");
    expect(email.text).toContain("/quotes/rfq-1");
  });

  it("omits the optional paragraphs when absent", () => {
    const email = composeQuoteSent({
      to: "dana@shipper.com",
      requestId: "rfq-1",
      allInRateUsd: "900.50",
      serviceDescription: "Hotshot, same day.",
    });
    expect(email.text).not.toContain("Not included");
    expect(email.text).not.toContain("How we priced it");
    expect(email.text).not.toContain("valid through");
  });
});

describe("status and booking emails", () => {
  it("booked email quotes the PEER reference and load link", () => {
    const email = composeLoadBooked({ to: "d@s.com", reference: "PEER-1001", loadId: "load-1" });
    expect(email.subject).toContain("PEER-1001");
    expect(email.text).toContain("Reference PEER-1001");
    expect(email.text).toContain("/loads/load-1");
  });

  it("status email weaves the note and extra lines between body and link", () => {
    const email = composeLoadStatus({
      to: "d@s.com",
      reference: "PEER-1001",
      loadId: "load-1",
      next: "in_transit",
      note: "Driver got loaded 40 minutes early.",
      extraLines: ["Live tracking (shareable, no login): http://x/track/tok"],
    });
    expect(email.subject).toContain("PEER-1001");
    const noteAt = email.text.indexOf("Driver got loaded");
    const trackAt = email.text.indexOf("Live tracking");
    const linkAt = email.text.indexOf("Load page:");
    expect(noteAt).toBeGreaterThan(-1);
    expect(trackAt).toBeGreaterThan(noteAt);
    expect(linkAt).toBeGreaterThan(trackAt);
  });
});

describe("delay emails", () => {
  it("delay email states the reason and the revised date in prose", () => {
    const email = composeDelaySet({
      to: "d@s.com",
      reference: "PEER-1001",
      loadId: "load-1",
      reason: "Breakdown near Sacramento",
      revisedDeliveryDate: "2026-08-09",
    });
    expect(email.subject).toContain("PEER-1001");
    expect(email.text).toContain("Breakdown near Sacramento");
    expect(email.text).toContain("Revised delivery: August 9, 2026");
  });

  it("delay email works without a revised date; clear email references the ref", () => {
    const noEta = composeDelaySet({
      to: "d@s.com",
      reference: "PEER-1001",
      loadId: "load-1",
      reason: "Weather hold",
    });
    expect(noEta.text).not.toContain("Revised delivery");
    const cleared = composeDelayCleared({ to: "d@s.com", reference: "PEER-1001", loadId: "load-1" });
    expect(cleared.subject).toContain("back on schedule");
    expect(cleared.text).toContain("PEER-1001");
  });
});

describe("invoice, update, document, needs-info, invite emails", () => {
  it("invoice email carries number, amount, and due date", () => {
    const email = composeInvoiceIssued({
      to: "d@s.com",
      reference: "PEER-1001",
      loadId: "load-1",
      number: "INV-1001",
      amountUsd: "1850",
      dueDate: "2026-09-05",
    });
    expect(email.subject).toBe("Invoice INV-1001 for PEER-1001");
    expect(email.text).toContain("Amount due: $1,850.00");
    expect(email.text).toContain("Due date: September 5, 2026");
  });

  it("custom update uses the founder's subject verbatim and appends the load link", () => {
    const email = composeCustomUpdate({
      to: "d@s.com",
      reference: "PEER-1001",
      loadId: "load-1",
      subject: "Quick update on your Reno load",
      body: "Truck is through the pass; still on time.",
    });
    expect(email.subject).toBe("Quick update on your Reno load");
    expect(email.text).toContain("through the pass");
    expect(email.text).toContain("/loads/load-1");
  });

  it("document email names the type; needs-info carries the ask", () => {
    const doc = composeDocumentShared({
      to: "d@s.com",
      reference: "PEER-1001",
      loadId: "load-1",
      typeLabel: "Proof of delivery",
      note: "Signed clean, no exceptions.",
    });
    expect(doc.subject).toContain("Proof of delivery");
    expect(doc.text).toContain("Signed clean, no exceptions.");
    const ask = composeNeedsInfo({ to: "d@s.com", requestId: "rfq-1", message: "Dock hours?" });
    expect(ask.text).toContain("Dock hours?");
  });

  it("invite email links the accept page and names the org", () => {
    const email = composeInviteEmail({
      to: "ops@shipper.com",
      orgName: "North Coast Brewing",
      inviterName: "Dana Meyer",
      inviteId: "inv-123",
    });
    expect(email.subject).toBe("Join North Coast Brewing on Peer Freight");
    expect(email.text).toContain("Dana Meyer invited you");
    expect(email.text).toContain("/invite/inv-123");
  });
});
