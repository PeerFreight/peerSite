/**
 * Date plumbing for the hand-rolled DateField: parse what a shipper types,
 * format what the field shows, and do the calendar-grid month math. All
 * dates are plain `YYYY-MM-DD` strings (what the RFQ schema and Postgres
 * `date` columns speak); no timezone handling on purpose.
 */

export type CalendarDate = { year: number; month: number; day: number }; // month 1-12

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number) {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

export function toISO({ year, month, day }: CalendarDate) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function fromISO(iso: string): CalendarDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  if (d.month < 1 || d.month > 12 || d.day < 1 || d.day > daysInMonth(d.year, d.month)) return null;
  return d;
}

/**
 * Parse a typed date. Accepts `8/5/2026`, `08/05/2026`, `8-5-2026`,
 * `2026-08-05`, and `8/5` / `8-5` (year assumed from `assumeYearFrom`,
 * rolling to the next year if the date has already passed). Returns the ISO
 * string or null if it isn't a real calendar date.
 */
export function parseDateInput(text: string, assumeYearFrom?: string): string | null {
  const t = text.trim();
  if (t === "") return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (iso) {
    const d = { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
    return fromISO(toISO(d)) ? toISO(d) : null;
  }

  const us = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?$/.exec(t);
  if (!us) return null;
  const month = Number(us[1]);
  const day = Number(us[2]);
  let year: number;
  if (us[3]) {
    year = Number(us[3]);
    if (us[3].length === 2) year += 2000;
  } else {
    const base = (assumeYearFrom && fromISO(assumeYearFrom)) || null;
    if (!base) return null;
    year = base.year;
    const candidate = { year, month, day };
    if (fromISO(toISO(candidate)) && toISO(candidate) < assumeYearFrom!) year += 1;
  }
  const d = { year, month, day };
  return fromISO(toISO(d)) ? toISO(d) : null;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthName(month: number) {
  return MONTH_NAMES[month - 1];
}

/** "Aug 5, 2026" — what the visible input shows after a successful parse. */
export function formatDateDisplay(iso: string): string {
  const d = fromISO(iso);
  if (!d) return iso;
  return `${MONTH_NAMES[d.month - 1].slice(0, 3)} ${d.day}, ${d.year}`;
}

/** Zeller-free day-of-week: 0 = Sunday. */
export function dayOfWeek(iso: string): number {
  const d = fromISO(iso);
  if (!d) return 0;
  // Sakamoto's algorithm.
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = d.year;
  if (d.month < 3) y -= 1;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[d.month - 1] + d.day) % 7;
}

export function addMonths(year: number, month: number, delta: number) {
  const zero = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zero / 12), month: (zero % 12 + 12) % 12 + 1 };
}

export function addDays(iso: string, delta: number): string {
  const d = fromISO(iso);
  if (!d) return iso;
  let { year, month, day } = d;
  day += delta;
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month);
    ({ year, month } = addMonths(year, month, 1));
  }
  while (day < 1) {
    ({ year, month } = addMonths(year, month, -1));
    day += daysInMonth(year, month);
  }
  return toISO({ year, month, day });
}

export function todayISO(): string {
  const now = new Date();
  return toISO({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}
