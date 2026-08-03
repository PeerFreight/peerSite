type Cta = { href: string; label: string };

/** Marketing site header. The action cluster carries the site's CTAs:
 * gold for the primary (get a quote, arrow icon), white for log in
 * (person icon). The primary CTA stays per-page. */
export function SiteHeader({ cta }: { cta: Cta }) {
  return (
    <header className="site-header" aria-label="Peer Freight navigation">
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
          <a className="btn btn--yellow" href={cta.href}>
            {cta.label}
            <span className="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>
          </a>
          <a className="btn btn--white" href="/login">
            Log in
            <span className="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-5.8 7-5.8s7 2.2 7 5.8"/></svg></span>
          </a>
        </div>
      </div>
    </header>
  );
}
