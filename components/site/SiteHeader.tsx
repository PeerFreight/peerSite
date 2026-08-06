type Cta = { href: string; label: string };

/** Marketing site header. The action cluster carries the site's CTAs:
 * gold for the primary (get a quote, arrow icon), white for log in
 * (person icon). The primary CTA stays per-page.
 *
 * `tone="solid"` keeps the navy background at all times, for pages with a
 * light surface at the top (legal pages) where the transparent-at-top header
 * would render white text on white. */
export function SiteHeader({ cta, tone }: { cta: Cta; tone?: "solid" }) {
  return (
    <header
      className={tone === "solid" ? "site-header site-header--solid" : "site-header"}
      aria-label="Peer Freight navigation"
    >
      <div className="site-header__inner">
        <a className="brand" href="/" aria-label="Peer Freight home">
          <img className="brand__mark" src="/site/peer-logo-mark.png" alt="" width={34} height={34} />
          <span className="brand__word"><span>Peer</span> <span>Freight</span></span>
        </a>
        <nav className="nav" aria-label="Primary">
          <a className="nav__home" href="/">Home</a>
          <a href="/carriers">For Carriers</a>
        </nav>
        <div className="site-header__actions">
          <a className="btn btn--white btn--plain" href="/login">Log in</a>
          <a className="btn btn--yellow" href={cta.href}>
            {cta.label}
            <span className="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>
          </a>
        </div>
      </div>
    </header>
  );
}
