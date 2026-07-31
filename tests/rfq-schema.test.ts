// The RFQ Zod schema is the single validation contract shared by the client
// form and the server action; these pin its conditional rules.
import { describe, expect, it } from "vitest";
import {
  EQUIPMENT_GROUPS,
  EQUIPMENT_OPTIONS,
  hazmatSummary,
  rfqFromFormData,
  rfqSchema,
} from "../lib/portal/rfq";

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
  hazmatUnNumber: "",
  hazmatShippingName: "",
  hazmatClass: "",
  hazmatPackingGroup: "",
  hazmatQuantity: "",
  hazmatPlacardsRequired: "",
  hazmatEmergencyContact: "",
  hazmatTechnicalName: "",
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

  it("requires UN number, shipping name, and class when hazmat is flagged — nothing more", () => {
    expect(rfqSchema.safeParse({ ...valid, hazmat: true }).success).toBe(false);
    const withCore = {
      ...valid,
      hazmat: true,
      hazmatUnNumber: "un 1170",
      hazmatShippingName: "Ethanol solution",
      hazmatClass: "3",
    };
    const parsed = rfqSchema.parse(withCore);
    expect(parsed.hazmatUnNumber).toBe("UN1170");
    expect(parsed.hazmatPackingGroup).toBeNull();
    // Packing group / quantity / placards / CHEMTREC stay optional.
    expect(
      rfqSchema.safeParse({ ...withCore, hazmatPackingGroup: "II", hazmatPlacardsRequired: "yes" })
        .success,
    ).toBe(true);
    expect(rfqSchema.safeParse({ ...withCore, hazmatUnNumber: "12" }).success).toBe(false);
    expect(rfqSchema.safeParse({ ...withCore, hazmatClass: "10" }).success).toBe(false);
  });

  it("summarizes structured hazmat and falls back to free text on old rows", () => {
    expect(
      hazmatSummary({
        hazmat: true,
        hazmatUnNumber: "UN1993",
        hazmatShippingName: "Diesel fuel",
        hazmatClass: "3",
        hazmatPackingGroup: "III",
        hazmatQuantity: "4 totes",
      }),
    ).toBe("UN1993 · Diesel fuel · Class 3 · PG III · 4 totes");
    expect(hazmatSummary({ hazmat: true, hazmatDetails: "UN1170, class 3" })).toBe(
      "UN1170, class 3",
    );
    expect(hazmatSummary({ hazmat: false })).toBeNull();
  });

  it("accepts every grouped equipment value and keeps the reefer temp rule", () => {
    expect(EQUIPMENT_OPTIONS.length).toBe(18);
    expect(EQUIPMENT_GROUPS.map((g) => g.label)).toEqual([
      "Van",
      "Temp controlled",
      "Open deck",
      "Bulk & tank",
      "Other",
    ]);
    for (const o of EQUIPMENT_OPTIONS) {
      const r = rfqSchema.safeParse({
        ...valid,
        equipment: o.value,
        temperatureF: o.value === "reefer" ? "38" : "",
      });
      expect(r.success).toBe(true);
    }
    expect(rfqSchema.safeParse({ ...valid, equipment: "reefer" }).success).toBe(false);
    expect(rfqSchema.safeParse({ ...valid, equipment: "warp_drive" }).success).toBe(false);
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
