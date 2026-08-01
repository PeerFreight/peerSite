import type { ReactNode } from "react";

/**
 * Full-bleed navy shell for the signed-out pages (login, signup,
 * onboarding): centered brand wordmark over the single white card, optional
 * footer line below it. The navy backdrop is what makes the card read — keep
 * these pages to exactly one lit surface.
 */
export function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="auth-bg flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <a
          href="/"
          className="mb-8 flex items-center justify-center gap-2.5"
          aria-label="Peer Freight home"
        >
          <img src="/site/peer-logo-mark.png" alt="" width={34} height={34} draggable={false} />
          <span className="text-lg font-extrabold tracking-tight">
            <span className="text-white">Peer</span> <span className="text-gold">Freight</span>
          </span>
        </a>
        <div className="rounded-xl bg-white p-6 shadow-card sm:p-8">{children}</div>
        {footer ? <p className="mt-5 text-center text-sm text-white/70">{footer}</p> : null}
      </div>
    </div>
  );
}
