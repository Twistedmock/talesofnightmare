/* Runs before the first paint, ahead of glass.js and weather.js.
 *
 * Two jobs, both of which have to happen before anything is on screen.
 *
 * Arms the fade-in by hiding the pieces up front, so nobody ever sees them
 * being hidden. The timer is the safety net: if glass.js is blocked, fails, or
 * simply never arrives, the work reappears on its own. A gallery that shows
 * nothing because one script died is not a gallery.
 *
 * Then it decides the weather. This is here rather than in weather.js because
 * weather.js is deferred, and a palette chosen after the first paint is a
 * visible flash of the wrong room.
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

  /* ------------------------------------------------------------- weather */

  // Kept in step with WEATHER in weather.js by hand. It is six words, and the
  // alternative is loading the whole table render-blocking to read six keys.
  var ALL = ['rain', 'snow', 'mist', 'sun', 'wind', 'ash'];
  var LAST = 'weather.last.v1';

  var pick = null;
  try { pick = localStorage.getItem('weather.pick.v2'); } catch (e) {}

  if (pick !== 'none' && ALL.indexOf(pick) === -1) {
    // Nothing pinned, so the room gets whatever it gets. Drawn from the five
    // it was not last time: a coin that lands the same way twice does not
    // read as weather, it reads as the site having one.
    var last = null;
    try { last = sessionStorage.getItem(LAST); } catch (e) {}
    var pool = ALL.filter(function (w) { return w !== last; });
    pick = pool[Math.floor(Math.random() * pool.length)];
    try { sessionStorage.setItem(LAST, pick); } catch (e) {}
  }

  d.setAttribute('data-weather', pick);
})();
