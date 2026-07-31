import type { ReactNode } from "react";

/**
 * Centered empty state for panels and pages: icon on a paper disc, short
 * title, one-line description, optional single action. Keep the action to
 * the one obvious next step (CTA policy: most empty states have none).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon ? (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-paper text-muted">
          {icon}
        </div>
      ) : null}
      <p className={`text-[0.95rem] font-extrabold text-ink ${icon ? "mt-3" : ""}`}>{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
