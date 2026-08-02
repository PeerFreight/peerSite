"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/field";
import { IconEye, IconEyeOff } from "@/components/ui/icons";

/**
 * Password input with a visibility toggle. Same anatomy as the date field:
 * padded control with a full-height square toggle hugging the right edge.
 * The toggle stays out of the tab-flow error path (aria-pressed announces
 * state) and never submits the form.
 */
export function PasswordInput({
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={`pr-10 ${className}`} {...props} />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy"
      >
        {visible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
      </button>
    </div>
  );
}
