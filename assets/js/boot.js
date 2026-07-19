/* Runs before the first paint, ahead of glass.js.
 *
 * Arms the fade-in by hiding the pieces up front, so nobody ever sees them
 * being hidden. The timer is the safety net: if glass.js is blocked, fails, or
 * simply never arrives, the work reappears on its own. A gallery that shows
 * nothing because one script died is not a gallery.
 *
 * This is a separate file rather than an inline <script> because the site's
 * Content-Security-Policy is script-src 'self', which blocks inline script —
 * and weakening the policy for four lines would be a poor trade.
 */
(function () {
  var d = document.documentElement;
  d.className += (d.className ? ' ' : '') + 'js-reveal';
  window.__glassFailsafe = setTimeout(function () {
    d.classList.remove('js-reveal');
  }, 3000);
})();
