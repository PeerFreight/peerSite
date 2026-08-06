import type { ReactNode } from "react";

/**
 * Signed-out overlay chrome shared by every public subpage that isn't the
 * dashboard: the marketing hero photo under a heavy navy wash, "Back to
 * site" in one corner (an optional page-specific link in the other), the
 * brand lockup, and the content as the one lit surface. Matching the site's
 * hero makes these pages read as an overlay on the site rather than a
 * separate app. Narrow pages (`width="md"`) put a white card inside (see
 * AuthShell); wide forms (`width="3xl"`) float a paper sheet instead.
 * Stays a server component — the invite page renders it server-side.
 */
const widths = { md: "max-w-md", "3xl": "max-w-3xl" } as const;

// md keeps auth-shell's exact class list (pixel parity with prod). Wide
// pages must use overflow-clip instead: hidden makes this div the sticky
// containing scrollport and the RFQ form's sticky action bar stops pinning
// to the viewport; clip clips identically without creating a scrollport.
const overflow = { md: "overflow-hidden", "3xl": "overflow-clip" } as const;

export function OverlayShell({
  width = "md",
  topRight,
  footer,
  children,
}: {
  width?: keyof typeof widths;
  topRight?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`auth-bg relative flex min-h-screen flex-col items-center justify-center ${overflow[width]} px-6 py-16`}>
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
      {topRight ? <div className="absolute right-5 top-5 z-10">{topRight}</div> : null}
      <div className={`relative w-full ${widths[width]}`}>
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
        {children}
        {footer ? <p className="mt-5 text-center text-sm text-white/70">{footer}</p> : null}
      </div>
    </div>
  );
}
