import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";

/**
 * Collapsed settings row: the current value, read-only, with one action that
 * opens the edit form. Settings display first — editing is opt-in, so the
 * page reads as facts about the account, not a wall of live inputs.
 */
export function ValueRow({
  label,
  value,
  hint,
  notice,
  actionLabel,
  onAction,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Success confirmation from the just-closed edit form; wins over hint. */
  notice?: string | null;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 truncate text-[0.95rem] font-bold text-ink">{value}</p>
        {onAction ? (
          <Button variant="secondary" size="sm" className="shrink-0" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
      {notice ? (
        <p className="text-sm font-bold text-green-800">{notice}</p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
