import type { HTMLAttributes } from "react";

/** Quiet white panel on the paper canvas: flat fill, no border, barely-rounded. */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl bg-white p-6 ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-lg font-extrabold text-ink ${className}`} {...props} />;
}

export function CardDescription({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`mt-1 text-sm text-muted ${className}`} {...props} />;
}
