/**
 * The inline chrome script the static site ran at the end of <body>:
 * header scroll state, non-draggable images, and (on form pages) the
 * FormSubmit ?sent=1 success toggle. Kept as a synchronous inline script so
 * the success state shows on first paint, exactly as before.
 */
export function ChromeScript({ formId }: { formId?: string }) {
  const sentToggle = formId
    ? `
      // After FormSubmit redirects back with ?sent=1, show the confirmation instead of the form.
      if (new URLSearchParams(location.search).get('sent') === '1') {
        document.getElementById('form-success').hidden = false;
        document.getElementById('${formId}').hidden = true;
      }
`
    : "";
  const script = `
    (function () {
      var header = document.querySelector('.site-header');
      function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
      window.addEventListener('scroll', onScroll, { passive: true });
      document.querySelectorAll('img').forEach(function (img) { img.setAttribute('draggable', 'false'); });
      onScroll();
${sentToggle}    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
