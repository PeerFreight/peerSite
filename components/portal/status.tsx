import type { LoadStatus, QuoteRequestStatus } from "@/db/schema";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { LOAD_STATUS_LABELS } from "@/lib/portal/loads";
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

/** Gold while the freight is moving; green once safely delivered. */
const LOAD_TONES: Record<LoadStatus, NonNullable<BadgeProps["tone"]>> = {
  booked: "navy",
  dispatched: "gold",
  in_transit: "gold",
  delivered: "green",
  invoiced: "navy",
  closed: "neutral",
  cancelled: "neutral",
};

export function LoadStatusBadge({ status }: { status: LoadStatus }) {
  return <Badge tone={LOAD_TONES[status]}>{LOAD_STATUS_LABELS[status]}</Badge>;
}
