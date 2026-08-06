"use client";

/**
 * Two- or three-way choice as attached cells — a miniature JoinedGrid —
 * instead of a dropdown. Native radios (sr-only) do the work: the value
 * posts through FormData with no JS, arrow keys move the selection for
 * free, and `defaultChecked` reseeds correctly across the draft-restore
 * `key` remounts. Pass `ariaLabel` — a Field label's `htmlFor` can't point
 * at a radio group. Four or more options stay a Select.
 */
export function SegmentedControl({
  name,
  options,
  defaultValue,
  onValueChange,
  ariaLabel,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid auto-cols-fr grid-flow-col gap-px overflow-hidden rounded-lg border border-line bg-line"
    >
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={o.value}
            defaultChecked={o.value === defaultValue}
            onChange={() => onValueChange?.(o.value)}
            className="peer sr-only"
          />
          <span className="flex h-full w-full items-center justify-center bg-white px-3 py-2 text-center text-sm font-bold text-muted peer-checked:bg-navy peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-gold">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
