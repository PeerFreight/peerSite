import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

// Tinted resting fill so controls read against white cards; focus lifts the
// field to white. Disabled drops the fill and dims instead. `aria-invalid`
// tints the control red while an error is showing.
const control =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-[0.95rem] text-ink placeholder:text-muted/60 focus:bg-white focus:outline-2 focus:outline-offset-1 focus:outline-navy disabled:bg-transparent disabled:text-muted aria-invalid:border-red-300 aria-invalid:bg-red-50/50 aria-invalid:focus:outline-red-400";

export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`block text-sm font-bold text-ink ${className}`} {...props} />;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${control} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${control} min-h-24 ${className}`} {...props} />;
}

/** Label + control + optional hint/error, stacked. Convention: unmarked
 * fields are required; pass `optional` to show the muted suffix. `labelEnd`
 * renders right-aligned on the label row (e.g. "Forgot password?"). */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional = false,
  labelEnd,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  labelEnd?: ReactNode;
  children: ReactNode;
}) {
  const labelNode = (
    <Label htmlFor={htmlFor}>
      {label}
      {optional ? (
        <span className="ml-1.5 text-xs font-semibold text-muted">Optional</span>
      ) : null}
    </Label>
  );
  return (
    <div className="space-y-1.5">
      {labelEnd ? (
        <div className="flex items-baseline justify-between gap-3">
          {labelNode}
          {labelEnd}
        </div>
      ) : (
        labelNode
      )}
      {children}
      {error ? (
        <p className="text-sm text-red-700" id={htmlFor ? `${htmlFor}-error` : undefined}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
