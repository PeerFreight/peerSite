import type { HTMLAttributes } from "react";

/** Pulsing placeholder block for route-level loading states. Size it with
 * width/height utilities; keep silhouettes to the page's real shapes. */
export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-line/60 ${className}`} {...props} />;
}
