export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <link
        rel="preload"
        href="/styles/fonts/manrope-latin.woff2"
        as="font"
        type="font/woff2"
        crossOrigin=""
      />
      <link rel="stylesheet" href="/styles/tokens.css?v=2" precedence="default" />
      <link rel="stylesheet" href="/site/newpeer.css?v=60" precedence="default" />
      <a className="skip-link" href="#main">Skip to content</a>
      {children}
    </>
  );
}
