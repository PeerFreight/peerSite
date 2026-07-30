import type { HTMLAttributes } from "react";

/** Status badge tones. Gold is reserved for states that need attention/action. */
type Tone = "neutral" | "gold" | "navy" | "green" | "red";

const tones: Record<Tone, string> = {
  neutral: "bg-paper text-muted",
  gold: "bg-gold/20 text-navy",
  navy: "bg-navy text-white",
  green: "bg-green-100 text-green-900",
  red: "bg-red-100 text-red-900",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
