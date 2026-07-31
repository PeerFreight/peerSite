import type { HTMLAttributes, ReactNode } from "react";

/**
 * White section panel on the paper canvas. The portal's sectioning system is
 * three flat brand tones (navy chrome, paper canvas, white surfaces) — no
 * borders or shadows. PanelHeader carries the small-caps section label and an
 * optional trailing action ("View all →").
 */
export function Panel({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`rounded-xl bg-white ${className}`} {...props} />;
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
