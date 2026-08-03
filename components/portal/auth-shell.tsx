import type { ReactNode } from "react";

/**
 * Signed-out shell (login, signup, onboarding): the marketing hero photo
 * under a heavy navy wash, brand lockup over the single white card,
 * optional footer line below it. Matching the site's hero makes these pages
 * read as an overlay on the site rather than a separate app; the dark
 * overlay keeps the card the one lit surface. The brand and the corner
 * link both lead back to the site.
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
      <a
        href="/"
        className="absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 text-sm font-bold text-white/70 transition-colors hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Back to site
      </a>
      <div className="relative w-full max-w-md">
        <a
          href="/"
          aria-label="Peer Freight home"
          className="mb-8 flex select-none items-center justify-center gap-[0.65rem]"
        >
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
        </a>
        <div className="rounded-xl bg-white p-7 shadow-card sm:p-9">{children}</div>
        {footer ? <p className="mt-5 text-center text-sm text-white/70">{footer}</p> : null}
      </div>
    </div>
  );
}
