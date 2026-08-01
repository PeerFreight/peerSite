"use client";

import { useEffect, useRef, useState } from "react";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import {
  addDays,
  addMonths,
  daysInMonth,
  dayOfWeek,
  formatDateDisplay,
  fromISO,
  monthName,
  parseDateInput,
  toISO,
  todayISO,
} from "@/lib/portal/dates";

const control =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-[0.95rem] text-ink placeholder:text-muted/60 focus:outline-2 focus:outline-offset-1 focus:outline-navy";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Brand date picker: a real text input (typing `8/5/2026`, `08/05/2026`, or
 * `2026-08-05` parses on blur) plus a flat popover calendar. The form posts
 * the hidden ISO input, so the Zod pipeline is unchanged. `min` disables
 * earlier days in the calendar (validation still owns the error message).
 */
export function DateField({
  id,
  name,
  defaultValue,
  min,
  required,
  invalid,
  describedBy,
  onValueChange,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  min?: string | null;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onValueChange?: (iso: string | null) => void;
}) {
  const [iso, setIso] = useState<string | null>(defaultValue ?? null);
  const [text, setText] = useState(defaultValue ? formatDateDisplay(defaultValue) : "");
  const [open, setOpen] = useState(false);
  const initial = iso ?? min ?? todayISO();
  const [view, setView] = useState(() => {
    const d = fromISO(initial)!;
    return { year: d.year, month: d.month };
  });
  const [focusedDay, setFocusedDay] = useState(initial);
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const today = todayISO();

  function commit(nextIso: string | null, nextText?: string) {
    setIso(nextIso);
    setText(nextText ?? (nextIso ? formatDateDisplay(nextIso) : ""));
    onValueChange?.(nextIso);
  }

  function openCalendar() {
    const base = iso ?? min ?? today;
    const d = fromISO(base) ?? fromISO(today)!;
    setView({ year: d.year, month: d.month });
    setFocusedDay(base);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Move focus onto the focused day whenever the calendar is open.
  useEffect(() => {
    if (!open) return;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${focusedDay}"]`)
      ?.focus();
  }, [open, focusedDay, view]);

  function moveFocus(delta: number) {
    const next = addDays(focusedDay, delta);
    const d = fromISO(next)!;
    setView({ year: d.year, month: d.month });
    setFocusedDay(next);
  }

  function onGridKeyDown(e: React.KeyboardEvent) {
    const handlers: Record<string, () => void> = {
      ArrowLeft: () => moveFocus(-1),
      ArrowRight: () => moveFocus(1),
      ArrowUp: () => moveFocus(-7),
      ArrowDown: () => moveFocus(7),
      PageUp: () => {
        const v = addMonths(view.year, view.month, -1);
        setView(v);
        setFocusedDay(clampToMonth(focusedDay, v.year, v.month));
      },
      PageDown: () => {
        const v = addMonths(view.year, view.month, 1);
        setView(v);
        setFocusedDay(clampToMonth(focusedDay, v.year, v.month));
      },
      Escape: () => {
        setOpen(false);
        toggleRef.current?.focus();
      },
    };
    const handler = handlers[e.key];
    if (handler) {
      e.preventDefault();
      handler();
    }
  }

  const disabled = (day: string) => Boolean(min && day < min);

  function select(day: string) {
    if (disabled(day)) return;
    commit(day);
    setOpen(false);
    toggleRef.current?.focus();
  }

  // Calendar grid: leading blanks then the month's days.
  const first = toISO({ year: view.year, month: view.month, day: 1 });
  const lead = dayOfWeek(first);
  const total = daysInMonth(view.year, view.month);
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) =>
      toISO({ year: view.year, month: view.month, day: i + 1 }),
    ),
  ];

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={iso ?? text.trim()} />
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className={`${control} pr-10`}
          placeholder="8/5/2026"
          value={text}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim() === "") {
              setIso(null);
              onValueChange?.(null);
            }
          }}
          onBlur={() => {
            const parsed = parseDateInput(text, min ?? today);
            if (parsed) commit(parsed);
            else if (text.trim() === "") commit(null, "");
            else onValueChange?.(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && !open) {
              e.preventDefault();
              openCalendar();
            }
          }}
        />
        <button
          ref={toggleRef}
          type="button"
          aria-label="Open calendar"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => (open ? setOpen(false) : openCalendar())}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy"
        >
          <IconCalendar size={16} />
        </button>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute left-0 top-full z-30 mt-2 w-[18.5rem] rounded-lg border border-line bg-white p-3 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setView((v) => addMonths(v.year, v.month, -1))}
              className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink"
            >
              <IconChevronLeft size={16} />
            </button>
            <p className="text-sm font-extrabold text-ink" aria-live="polite">
              {monthName(view.month)} {view.year}
            </p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setView((v) => addMonths(v.year, v.month, 1))}
              className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink"
            >
              <IconChevronRight size={16} />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-7 text-center">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1 text-[0.68rem] font-bold uppercase tracking-wide text-muted">
                {d}
              </span>
            ))}
          </div>
          <div ref={gridRef} className="grid grid-cols-7" onKeyDown={onGridKeyDown}>
            {cells.map((day, i) =>
              day === null ? (
                <span key={`blank-${i}`} />
              ) : (
                <button
                  key={day}
                  type="button"
                  data-date={day}
                  tabIndex={day === focusedDay ? 0 : -1}
                  disabled={disabled(day)}
                  aria-label={formatDateDisplay(day)}
                  aria-pressed={day === iso}
                  aria-current={day === today ? "date" : undefined}
                  onClick={() => select(day)}
                  onFocus={() => setFocusedDay(day)}
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums ${
                    day === iso
                      ? "bg-navy font-extrabold text-white"
                      : disabled(day)
                        ? "text-muted/40"
                        : "font-bold text-ink hover:bg-paper"
                  } ${day === today && day !== iso ? "ring-1 ring-inset ring-gold" : ""}`}
                >
                  {Number(day.slice(8))}
                </button>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function clampToMonth(iso: string, year: number, month: number) {
  const d = fromISO(iso)!;
  return toISO({ year, month, day: Math.min(d.day, daysInMonth(year, month)) });
}
