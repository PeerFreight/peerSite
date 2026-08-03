type Cta = { href: string; label: string };

/** Marketing site header. `Log in` sits with the primary CTA in the action
 * cluster (it's a main call to action, not a nav tab); the primary CTA
 * stays per-page. */
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
          <a className="btn btn--ghost" href="/login">Log in</a>
          <a className="btn btn--white" href={cta.href}>{cta.label}</a>
        </div>
      </div>
    </header>
  );
}
