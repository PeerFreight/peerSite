import type { ReactNode } from "react";

/**
 * KPI cell for a JoinedGrid row: small-caps label (with an optional muted
 * icon opposite it, echoing the marketing site's icon cards) over a big
 * tabular number. Cells are square-cornered — the wrapping JoinedGrid owns
 * the border, radius, and hairline joints between tiles.
 */
export function StatTile({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: string | number;
  href?: string;
  icon?: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="section-label">{label}</p>
        {icon ? <span className="text-muted/70">{icon}</span> : null}
      </div>
      <p className="mt-3 text-3xl font-extrabold tabular-nums text-ink">{value}</p>
    </>
  );
  return href ? (
    <a href={href} className="block bg-white p-5 transition-colors hover:bg-paper/70">
      {body}
    </a>
  ) : (
    <div className="bg-white p-5">{body}</div>
  );
}
