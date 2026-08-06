import type { ReactNode } from "react";
import { OverlayShell } from "./overlay-shell";

/**
 * Signed-out shell (login, signup, onboarding, invite): the shared overlay
 * chrome with the single white card as the lit surface. The heavy shadow is
 * reserved for this card; signed-in surfaces use the hairline system.
 */
export function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <OverlayShell width="md" footer={footer}>
      <div className="rounded-xl bg-white p-7 shadow-card sm:p-9">{children}</div>
    </OverlayShell>
  );
}
