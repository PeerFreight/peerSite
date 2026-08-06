/**
 * The inline chrome script the static site ran at the end of <body>:
 * header scroll state, kept synchronous so the scrolled header state is
 * right on first paint. (The old draggable="false" img loop is gone — it
 * mutated the DOM before React hydrated, which tripped a hydration-mismatch
 * warning; the stylesheet's img { -webkit-user-drag: none } covers it.)
 */
export function ChromeScript() {
  const script = `
    (function () {
      var header = document.querySelector('.site-header');
      function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
