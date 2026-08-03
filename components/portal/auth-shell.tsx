import type { ReactNode } from "react";

/**
 * Signed-out shell (login, signup, onboarding): the marketing hero photo
 * under a heavier navy wash, brand lockup over the single white card,
 * optional footer line below it. Matching the site's hero makes these pages
 * read as an overlay on the site rather than a separate app; the darker
 * overlay keeps the card the one lit surface.
 */
export function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="auth-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <img
        src="/site/freight-tanker-day.jpg"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute inset-0 h-full w-full select-none object-cover object-[right_center]"
      />
      <div aria-hidden="true" className="auth-overlay absolute inset-0" />
      <div className="relative w-full max-w-md">
        {/* Static brand stamp, not a link: nothing on the auth screen should
            navigate away or drag. Sized to match the site header exactly. */}
        <div className="mb-8 flex select-none items-center justify-center gap-[0.65rem]">
          <img
            src="/site/peer-logo-mark.png"
            alt=""
            width={36}
            height={36}
            className="rounded-[8px]"
            draggable={false}
          />
          <span className="auth-brand">
            <span>Peer</span> <span>Freight</span>
          </span>
        </div>
        <div className="rounded-xl bg-white p-7 shadow-card sm:p-9">{children}</div>
        {footer ? <p className="mt-5 text-center text-sm text-white/70">{footer}</p> : null}
      </div>
    </div>
  );
}
