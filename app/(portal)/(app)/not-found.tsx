import { Panel } from "@/components/ui/panel";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconInbox } from "@/components/ui/icons";

/** Styled notFound() target inside the portal chrome — replaces Next's
 * unstyled default when a quote/load/invoice id doesn't resolve. */
export default function PortalNotFound() {
  return (
    <Panel>
      <EmptyState
        icon={<IconInbox size={20} />}
        title="Not found"
        description="That page doesn't exist, or it belongs to a different company profile."
        action={
          <LinkButton href="/dashboard" variant="secondary" size="sm">
            Back to dashboard
          </LinkButton>
        }
      />
    </Panel>
  );
}
