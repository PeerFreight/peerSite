import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

const variants: Record<Variant, string> = {
  primary: "btn-gold-grad text-navy",
  secondary: "bg-white text-ink border border-line hover:bg-paper",
  ghost: "bg-transparent text-ink hover:bg-paper",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
};

const sizes: Record<Size, string> = {
  sm: "text-sm px-3.5 py-1.5",
  md: "text-[0.95rem] px-5 py-2.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

export interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  size?: Size;
}

/** Anchor styled as a button, for navigation CTAs. */
export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: LinkButtonProps) {
  return <a className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
