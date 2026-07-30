// The RFQ Zod schema is the single validation contract shared by the client
// form and the server action; these pin its conditional rules.
import { describe, expect, it } from "vitest";
import { rfqSchema, rfqFromFormData } from "../lib/portal/rfq";

const valid = {
  originAddress: "",
  originCity: "Petaluma",
  originState: "ca",
  originZip: "94952",
  originHours: "",
  originScheduling: "fcfs",
  destAddress: "",
  destCity: "Reno",
  destState: "NV",
  destZip: "89502",
  destHours: "",
  destScheduling: "appointment",
  pickupDate: "2026-08-05",
  pickupWindow: "",
  deliveryDate: "2026-08-06",
  deliveryWindow: "",
  dateFlexibility: "exact",
  commodity: "Packaged beer",
  weightLbs: "38000",
  pieces: "26 pallets",
  dims: "",
  declaredValueUsd: "$45,000".replace(",", ""),
  equipment: "dry_van_53",
  temperatureF: "",
  equipmentNotes: "",
  hazmat: false,
  hazmatDetails: "",
  accessorials: ["liftgate_delivery"],
  referenceNumbers: [{ label: "PO", value: "PO-1" }],
  targetRateUsd: "",
  frequency: "one_time",
  notes: "",
};

describe("rfqSchema", () => {
  it("accepts a complete request and normalizes state / money / blanks", () => {
    const parsed = rfqSchema.parse(valid);
    expect(parsed.originState).toBe("CA");
    expect(parsed.weightLbs).toBe(38000);
    expect(parsed.declaredValueUsd).toBe("45000");
    expect(parsed.targetRateUsd).toBeNull();
    expect(parsed.originAddress).toBeNull();
  });

  it("requires a reefer temperature", () => {
    const r = rfqSchema.safeParse({ ...valid, equipment: "reefer" });
    expect(r.success).toBe(false);
    expect(rfqSchema.safeParse({ ...valid, equipment: "reefer", temperatureF: "38" }).success).toBe(true);
  });

  it("requires hazmat details when hazmat is flagged, but does not block submission", () => {
    expect(rfqSchema.safeParse({ ...valid, hazmat: true }).success).toBe(false);
    expect(
      rfqSchema.safeParse({ ...valid, hazmat: true, hazmatDetails: "UN1170, class 3" }).success,
    ).toBe(true);
  });

  it("rejects delivery before pickup and malformed zip / rate", () => {
    expect(rfqSchema.safeParse({ ...valid, deliveryDate: "2026-08-04" }).success).toBe(false);
    expect(rfqSchema.safeParse({ ...valid, originZip: "9495" }).success).toBe(false);
    expect(rfqSchema.safeParse({ ...valid, targetRateUsd: "about 2k" }).success).toBe(false);
  });

  it("round-trips a posted form, dropping empty reference rows", () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(valid)) {
      if (k === "accessorials") fd.append("accessorials", "liftgate_delivery");
      else if (k === "referenceNumbers") {
        fd.set("refLabel0", "PO");
        fd.set("refValue0", "PO-1");
      } else if (k === "hazmat") {
        // unchecked checkbox: absent from form data
      } else fd.set(k, String(v));
    }
    const parsed = rfqSchema.parse(rfqFromFormData(fd));
    expect(parsed.hazmat).toBe(false);
    expect(parsed.referenceNumbers).toEqual([{ label: "PO", value: "PO-1" }]);
    expect(parsed.accessorials).toEqual(["liftgate_delivery"]);
  });
});
