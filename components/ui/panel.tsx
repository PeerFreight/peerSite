import type { HTMLAttributes, ReactNode } from "react";

/**
 * White section panel on the paper canvas. Surfaces are bordered — the
 * hairline (--color-line) carries the structure, with a barely-there shadow
 * for lift; heavy shadows stay reserved for the signed-out card. PanelHeader
 * carries the small-caps section label and an optional trailing action
 * ("View all →").
 */
export function Panel({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={`rounded-xl border border-line bg-white shadow-panel ${className}`}
      {...props}
    />
  );
}

/**
 * Attached sections: one bordered surface whose cells meet at hairline
 * joints instead of floating as separate cards (the marketing site's mosaic
 * pattern). Pass grid-cols-* classes for the shape; cells must set bg-white
 * (the gap-px lets the line-colored backdrop show through as the joints).
 */
export function JoinedGrid({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={`grid gap-px overflow-hidden rounded-xl border border-line bg-line shadow-panel ${className}`}
      {...props}
    />
  );
}

export function PanelHeader({
  label,
  action,
  className = "",
}: {
  label: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex items-baseline justify-between gap-4 px-6 pt-5 ${className}`}>
      <h2 className="section-label">{label}</h2>
      {action}
    </header>
  );
}

export function PanelBody({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-6 py-5 ${className}`} {...props} />;
}
