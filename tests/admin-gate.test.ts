// Security-hardening backstop: EVERY export of the admin query layers must
// refuse a non-admin (and an unverified founder-domain account) before doing
// anything else. The db argument is a poisoned stub on purpose — if a
// function ever touches the database before proving the role, the test fails
// with the stub's error instead of "Admin only". A completeness sweep pins
// the export lists so a new admin function can't ship ungated unnoticed.
import { describe, expect, it } from "vitest";
import * as adminQueries from "../lib/portal/admin-queries";
import type { AdminUser } from "../lib/portal/admin-queries";
import type { PortalDb } from "../lib/portal/queries";

const db = new Proxy(
  {},
  {
    get(_t, prop) {
      throw new Error(`database touched (.${String(prop)}) before the admin gate`);
    },
  },
) as PortalDb;

const notAdmin: AdminUser = { id: "user-a", email: "a@shipper-a.com", emailVerified: true };
const unverifiedFounderDomain: AdminUser = {
  id: "user-x",
  email: "mallory@peer-freight.com",
  emailVerified: false,
};

// One entry per admin-gated export; arguments past the user are dummies —
// assertAdmin must throw before any of them is used.
const gated: Record<string, (u: AdminUser) => Promise<unknown>> = {
  listOpenQuoteRequests: (u) => adminQueries.listOpenQuoteRequests(db, u),
  getQuoteRequestForAdmin: (u) => adminQueries.getQuoteRequestForAdmin(db, u, "rfq-1"),
  sendQuote: (u) => adminQueries.sendQuote(db, u, "rfq-1", {} as never),
  requestInfo: (u) => adminQueries.requestInfo(db, u, "rfq-1", "?"),
  bookLoad: (u) => adminQueries.bookLoad(db, u, "quote-1"),
  listLoadsForAdmin: (u) => adminQueries.listLoadsForAdmin(db, u),
  getLoadForAdmin: (u) => adminQueries.getLoadForAdmin(db, u, "load-1"),
  setLoadStatus: (u) => adminQueries.setLoadStatus(db, u, "load-1", {} as never),
  setLoadDelay: (u) => adminQueries.setLoadDelay(db, u, "load-1", {} as never),
  clearLoadDelay: (u) => adminQueries.clearLoadDelay(db, u, "load-1"),
  createInvoice: (u) => adminQueries.createInvoice(db, u, "load-1", {} as never),
  markInvoicePaid: (u) => adminQueries.markInvoicePaid(db, u, "INV-1001"),
  sendShipperUpdate: (u) => adminQueries.sendShipperUpdate(db, u, "load-1", {} as never),
  addDocument: (u) => adminQueries.addDocument(db, u, "load-1", {} as never),
  setDocumentVisibility: (u) => adminQueries.setDocumentVisibility(db, u, "doc-1", true),
  getDocumentForAdmin: (u) => adminQueries.getDocumentForAdmin(db, u, "doc-1"),
  upsertCarrierAssignment: (u) => adminQueries.upsertCarrierAssignment(db, u, "load-1", {} as never),
};

describe("admin gate covers every admin-surface export", () => {
  it("sweeps every export of admin-queries", () => {
    const exported = Object.keys(adminQueries);
    expect(exported.sort()).toEqual(Object.keys(gated).sort());
  });

  for (const [name, call] of Object.entries(gated)) {
    it(`${name} refuses non-admins before touching the database`, async () => {
      await expect(call(notAdmin)).rejects.toThrow("Admin only");
      await expect(call(unverifiedFounderDomain)).rejects.toThrow("Admin only");
    });
  }
});
