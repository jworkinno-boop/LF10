/*
 * Applies a stored "dark" choice before first paint, so choosing dark does not
 * flash light on every navigation.
 *
 * index.html ships `data-theme="light"` in the markup, so the default needs no
 * JavaScript and this file only ever has to switch it to dark. The app does not
 * follow prefers-color-scheme by design: it always starts light.
 *
 * It lives in a file rather than an inline <script> because the nginx CSP is
 * `script-src 'self'` with no 'unsafe-inline', and that is worth more than
 * saving one same-origin request.
 *
 * Keep the storage key in step with THEME_STORAGE_KEY in src/theme.tsx.
 */
(function () {
  try {
    if (localStorage.getItem('trustpay.theme.v1') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {
    /* Private-mode Safari throws on localStorage; the markup default stands. */
  }
})();
