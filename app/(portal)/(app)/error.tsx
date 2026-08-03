"use client";

import { Panel } from "@/components/ui/panel";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconAlertTriangle } from "@/components/ui/icons";

/** Route-level error boundary inside the portal chrome (sidebar stays up). */
export default function PortalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Panel>
      <EmptyState
        icon={<IconAlertTriangle size={20} />}
        title="Something went wrong"
        description="That page hit an unexpected error. Try again — if it keeps happening, email team@peer-freight.com and we will take a look."
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={reset}>
              Try again
            </Button>
            <LinkButton href="/dashboard" variant="secondary" size="sm">
              Back to dashboard
            </LinkButton>
          </div>
        }
      />
    </Panel>
  );
}
