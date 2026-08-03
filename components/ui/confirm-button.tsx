"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Two-step inline confirm for destructive form actions (no modals in the
 * portal). First click arms it — "Confirm? Yes / Keep" — and it auto-reverts
 * to safe after 4s if left alone. Must render inside the <form> whose action
 * it confirms: "Yes" is the real submit, and the in-flight state comes from
 * useFormStatus.
 */
export function ConfirmButton({
  label,
  variant = "secondary",
  size = "md",
  className = "",
}: {
  label: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (!armed || pending) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed, pending]);

  if (!armed) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setArmed(true)}
      >
        {label}
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-sm font-bold text-red-700">Confirm?</span>
      <Button type="submit" variant="danger" size={size} loading={pending}>
        Yes
      </Button>
      <Button type="button" variant="ghost" size={size} disabled={pending} onClick={() => setArmed(false)}>
        Keep
      </Button>
    </span>
  );
}
