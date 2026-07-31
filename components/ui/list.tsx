import type { ReactNode } from "react";
import { IconChevronRight } from "@/components/ui/icons";
import { Panel, PanelHeader } from "@/components/ui/panel";

/**
 * The portal's list surface: a white panel of divided rows, each row a full
 * link with a trailing chevron. Replaces the hand-rolled `ul divide-y` +
 * border lists that used to sit directly on the canvas.
 */
export function ListPanel({
  label,
  action,
  children,
  className = "",
}: {
  label?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Panel className={`overflow-hidden ${className}`}>
      {label ? <PanelHeader label={label} action={action} className="pb-2" /> : null}
      <ul className="divide-y divide-line">{children}</ul>
    </Panel>
  );
}

export function ListRow({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="group flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 transition-colors hover:bg-paper"
      >
        {children}
        <IconChevronRight size={16} className="shrink-0 text-muted/50 group-hover:text-muted" />
      </a>
    </li>
  );
}
