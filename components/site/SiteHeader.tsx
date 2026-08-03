type Cta = { href: string; label: string };

/** Marketing site header. `Log in` is the portal entry; the primary CTA
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
          <a href="/login">Log in</a>
        </nav>
        <a className="btn btn--white" href={cta.href}>{cta.label}</a>
      </div>
    </header>
  );
}
