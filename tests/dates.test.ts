// Date parsing/formatting for the hand-rolled DateField. Typing must keep
// working — these pin every accepted input shape and the calendar math.
import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  dayOfWeek,
  daysInMonth,
  formatDateDisplay,
  parseDateInput,
} from "../lib/portal/dates";

describe("parseDateInput", () => {
  it("accepts US and ISO shapes", () => {
    expect(parseDateInput("8/5/2026")).toBe("2026-08-05");
    expect(parseDateInput("08/05/2026")).toBe("2026-08-05");
    expect(parseDateInput("8-5-2026")).toBe("2026-08-05");
    expect(parseDateInput("8/5/26")).toBe("2026-08-05");
    expect(parseDateInput("2026-08-05")).toBe("2026-08-05");
    expect(parseDateInput("2026-8-5")).toBe("2026-08-05");
    expect(parseDateInput("  12/31/2026 ")).toBe("2026-12-31");
  });

  it("fills the year for month/day input, rolling forward past dates", () => {
    expect(parseDateInput("8/5", "2026-07-30")).toBe("2026-08-05");
    expect(parseDateInput("2/1", "2026-07-30")).toBe("2027-02-01");
    expect(parseDateInput("8/5")).toBeNull(); // no base year to assume
  });

  it("rejects things that are not real dates", () => {
    expect(parseDateInput("")).toBeNull();
    expect(parseDateInput("tomorrow")).toBeNull();
    expect(parseDateInput("13/1/2026")).toBeNull();
    expect(parseDateInput("2/30/2026")).toBeNull();
    expect(parseDateInput("2026-02-30")).toBeNull();
    expect(parseDateInput("8/5/20266")).toBeNull();
  });

  it("handles leap years", () => {
    expect(parseDateInput("2/29/2028")).toBe("2028-02-29");
    expect(parseDateInput("2/29/2026")).toBeNull();
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
  });
});

describe("calendar math", () => {
  it("formats for display", () => {
    expect(formatDateDisplay("2026-08-05")).toBe("Aug 5, 2026");
    expect(formatDateDisplay("2026-12-31")).toBe("Dec 31, 2026");
  });

  it("knows weekdays", () => {
    expect(dayOfWeek("2026-07-30")).toBe(4); // Thursday
    expect(dayOfWeek("2026-08-01")).toBe(6); // Saturday
    expect(dayOfWeek("2024-02-29")).toBe(4); // Thursday
  });

  it("walks months and days across boundaries", () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-08-05", 7)).toBe("2026-08-12");
  });
});
