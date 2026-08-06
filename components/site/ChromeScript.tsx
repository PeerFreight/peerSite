/**
 * The inline chrome script the static site ran at the end of <body>:
 * header scroll state and non-draggable images. Kept as a synchronous inline
 * script so the scrolled header state is right on first paint. (The old
 * FormSubmit ?sent=1 toggle left with the relay — the carrier setup form now
 * posts to our own server action and renders its own success state.)
 */
export function ChromeScript() {
  const script = `
    (function () {
      var header = document.querySelector('.site-header');
      function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
      window.addEventListener('scroll', onScroll, { passive: true });
      document.querySelectorAll('img').forEach(function (img) { img.setAttribute('draggable', 'false'); });
      onScroll();
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
