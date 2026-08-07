export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer__word" aria-hidden="true" data-reveal>Peer</div>
      <div className="wrap">
        <div className="footer__legal">
          <span>USDOT 5766712 · $75K BMC-84 bond on file · FMCSA broker authority pending · TIA member</span>
          <span className="footer__links">
            <a href="/carriers">For carriers</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/login">Log in</a>
            <a className="footer__social" href="https://www.ycombinator.com/" aria-label="Y Combinator"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 3h18v18H3z" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M11.5 13.5 8 7h1.9l2.1 4 2.1-4h1.9L12.5 13.5V17h-1z"/></svg></a>
            <a className="footer__social" href="https://www.linkedin.com/company/peercv" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.94 8.5H4.5V19h2.44V8.5ZM5.72 4.5A1.42 1.42 0 1 0 5.72 7.34 1.42 1.42 0 0 0 5.72 4.5ZM19.5 19h-2.44v-5.13c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7V19h-2.44V8.5h2.34v1.43h.03c.33-.62 1.13-1.28 2.33-1.28 2.49 0 2.95 1.64 2.95 3.77V19Z"/></svg></a>
            <span>© 2026 Peer Freight</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
