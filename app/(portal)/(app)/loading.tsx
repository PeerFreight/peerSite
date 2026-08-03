import { JoinedGrid } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading state for the signed-in portal. Every page under the
 * shell is force-dynamic (session + DB on each navigation), so without this
 * the UI freezes on the old page until the fetch lands. Dashboard-silhouette
 * shapes: title block, KPI row, list panel.
 */
export default function PortalLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <JoinedGrid className="sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3 bg-white p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </JoinedGrid>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`flex items-center gap-4 p-5 ${i > 0 ? "border-t border-line" : ""}`}>
            <Skeleton className="h-4 w-20" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
