type Cta = { href: string; label: string };

/**
 * Marketing site header. `signIn` is the portal entry slot — leave unset until
 * the shipper portal ships so the header stays pixel-identical to production.
 */
export function SiteHeader({ cta, signIn }: { cta: Cta; signIn?: Cta }) {
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
          {signIn ? <a href={signIn.href}>{signIn.label}</a> : null}
        </nav>
        <a className="btn btn--white" href={cta.href}>{cta.label}</a>
      </div>
    </header>
  );
}
