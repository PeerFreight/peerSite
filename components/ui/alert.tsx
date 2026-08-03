import type { HTMLAttributes } from "react";
import { IconAlertTriangle, IconCheck, IconInfo } from "@/components/ui/icons";

type Tone = "error" | "success" | "info";

const tones: Record<Tone, { classes: string; icon: React.ReactNode }> = {
  error: {
    classes: "border-red-200 bg-red-50 text-red-800",
    icon: <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />,
  },
  success: {
    classes: "border-green-200 bg-green-50 text-green-800",
    icon: <IconCheck size={16} className="mt-0.5 shrink-0" />,
  },
  info: {
    classes: "border-line bg-paper text-ink",
    icon: <IconInfo size={16} className="mt-0.5 shrink-0 text-muted" />,
  },
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
}

/**
 * Bordered inline callout for form-adjacent feedback (no floating toasts —
 * feedback stays attached to the surface that caused it). Re-key it per
 * submit attempt (`key={attempt}`) so the enter animation replays on every
 * failed retry and repeat mistakes are visibly acknowledged.
 */
export function Alert({ tone = "info", className = "", children, ...props }: AlertProps) {
  const t = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`alert-in flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm font-semibold ${t.classes} ${className}`}
      {...props}
    >
      {t.icon}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
