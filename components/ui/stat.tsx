/**
 * Purely typographic KPI tile: small-caps label over a big tabular number on
 * a white panel. No icons, no deltas — the dashboard's numbers at a glance.
 */
export function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const body = (
    <>
      <p className="section-label">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink">{value}</p>
    </>
  );
  return href ? (
    <a href={href} className="block rounded-xl bg-white p-5 transition-colors hover:bg-white/70">
      {body}
    </a>
  ) : (
    <div className="rounded-xl bg-white p-5">{body}</div>
  );
}
