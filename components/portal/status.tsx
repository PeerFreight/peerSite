import type { QuoteRequestStatus } from "@/db/schema";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/portal/rfq";

/** Gold marks states that need the viewer's attention or action. */
const TONES: Record<QuoteRequestStatus, NonNullable<BadgeProps["tone"]>> = {
  submitted: "navy",
  needs_info: "gold",
  quoted: "gold",
  accepted: "green",
  declined: "neutral",
  expired: "neutral",
  withdrawn: "neutral",
};

export function StatusBadge({ status }: { status: QuoteRequestStatus }) {
  return <Badge tone={TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}
