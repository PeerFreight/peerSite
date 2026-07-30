import type { LoadStatus } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { LOAD_STATUS_LABELS, LOAD_STATUS_PATH } from "@/lib/portal/loads";

/** The load's forward path with everything reached so far filled in — the
 * one-glance answer to "where is my freight?". Cancelled renders as a flat
 * notice instead of a broken path. */
export function LoadProgress({ status }: { status: LoadStatus }) {
  if (status === "cancelled") {
    return <Badge tone="neutral">This load was cancelled</Badge>;
  }
  const reached = LOAD_STATUS_PATH.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-y-2">
      {LOAD_STATUS_PATH.map((step, i) => {
        const done = i <= reached;
        const current = i === reached;
        return (
          <li key={step} className="flex items-center">
            {i > 0 ? (
              <span
                aria-hidden
                className={`mx-1.5 h-px w-5 sm:w-8 ${i <= reached ? "bg-navy" : "bg-line"}`}
              />
            ) : null}
            <span
              className={`flex items-center gap-1.5 text-xs font-bold ${
                current ? "text-navy" : done ? "text-ink" : "text-muted"
              }`}
            >
              <span
                aria-hidden
                className={`h-2.5 w-2.5 rounded-full ${
                  current ? "bg-gold" : done ? "bg-navy" : "bg-line"
                }`}
              />
              {LOAD_STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
