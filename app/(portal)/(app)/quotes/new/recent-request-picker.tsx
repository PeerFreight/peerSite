"use client";

/**
 * Quiet "start from a previous request" strip above the wizard. Picking a
 * lane reloads the page with `?from=<id>`, so the server does the org-scoped
 * prefill — the browser never sees another org's data path.
 */
export function RecentRequestPicker({
  options,
  selected,
}: {
  options: { id: string; label: string }[];
  selected?: string;
}) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
      <span className="font-bold">Start from a previous request</span>
      <select
        className="max-w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink focus:outline-2 focus:outline-offset-1 focus:outline-navy"
        defaultValue={selected ?? ""}
        onChange={(e) => {
          window.location.href = e.target.value
            ? `/quotes/new?from=${e.target.value}`
            : "/quotes/new";
        }}
      >
        <option value="">Blank request</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
