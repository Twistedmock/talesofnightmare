/* ==========================================================================
   The glass.
   Each piece hangs behind a pane of condensation. You wipe it to see the work,
   and the fog comes back, because it always does. Everything below is a
   progressive enhancement: with this file blocked the gallery is simply a
   gallery, sharp and readable.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- settings */

  var CFG = {
    maskWidth:   112,   // fog resolution — low on purpose, it upscales soft
    viewMax:     760,   // cap on the sharp-layer canvas
    fps:         30,
    refog:       0.0052, // alpha removed from the mask each tick
    wipeRadius:  0.14,  // fraction of the pane's smaller side
    dropChance:  0.014, // per tick, per pane
    clearedAt:   2.6,   // accumulated wipe "work" that counts as looked-at
    plateRefog:  0.0042 // the lightbox fogs more slowly, but it does fog
  };

  var SEEN_KEY = 'glass.seen.v1';
  var HINT_KEY = 'glass.hinted.v1';
  // v2: v1 holds phantom values written during start-up by an earlier
  // version, so it cannot be trusted and is deliberately abandoned.
  var FOG_KEY  = 'glass.fog.v2';

  // On by default — the fog is the point of the gallery. A visitor who turns
  // it off keeps it off.
  var fogOn = true;
  var TOUCHED_KEY = 'glass.toggled.v1';

  /* --------------------------------------------------------- the one hint */

  var promptEl = null;

  /**
   * Called only from real pointer input, never from the droplets — otherwise
   * the run-off would dismiss the instruction a second after load, before
   * anyone had read it.
   */
  function dismissPrompt() {
    if (!promptEl) return;
    var el = promptEl;
    promptEl = null;
    el.classList.add('is-done');
    try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {}
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1100);
  }

  function setupPrompt() {
    promptEl = document.getElementById('wipePrompt');
    if (!promptEl) return;
    var known = false;
    try { known = localStorage.getItem(HINT_KEY) === '1'; } catch (e) {}
    if (known) {
      promptEl.parentNode.removeChild(promptEl);
      promptEl = null;
    }
  }

  /* --------------------------------------------------------------- memory */

  var seen = load();

  function load() {
    try {
      var raw = localStorage.getItem(SEEN_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function remember(id) {
    if (!id || seen.indexOf(id) !== -1) return;
    seen.push(id);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) {}
    tally();
  }

  function tally() {
    var el = document.getElementById('tally');
    if (!el) return;
    var total = parseInt(el.getAttribute('data-total'), 10) || 0;
    var ids = [].slice.call(document.querySelectorAll('.piece')).map(function (p) {
      return p.getAttribute('data-id');
    });
    var count = ids.filter(function (id) { return seen.indexOf(id) !== -1; }).length;

    if (!count || !total) { el.textContent = ''; return; }
    if (count >= total) {
      el.textContent = 'You looked at every one. That is rarer than you would think.';
      el.classList.add('is-complete');
    } else {
      el.textContent = 'You have looked properly at ' + count + ' of ' + total + '.';
      el.classList.remove('is-complete');
    }
  }

  /* ----------------------------------------------------------------- Pane */

  function Pane(frame, img, canvas, id) {
    this.frame = frame;
    this.img = img;
    this.canvas = canvas;
    this.id = id;
    this.ctx = canvas.getContext('2d');
    this.mask = document.createElement('canvas');
    this.mctx = this.mask.getContext('2d');
    this.drops = [];
    this.work = 0;
    this.cleared = false;
    this.active = false;
    this.ready = false;
    this.dirty = true;
  }

  Pane.prototype.measure = function () {
    var rect = this.frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.min(Math.round(rect.width * dpr), CFG.viewMax);
    var h = Math.max(1, Math.round(w * (rect.height / rect.width)));

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;

      // Preserve whatever has already been wiped across a resize.
      var previous = null;
      if (this.mask.width) {
        previous = document.createElement('canvas');
        previous.width = this.mask.width;
        previous.height = this.mask.height;
        previous.getContext('2d').drawImage(this.mask, 0, 0);
      }
      this.mask.width = CFG.maskWidth;
      this.mask.height = Math.max(1, Math.round(CFG.maskWidth * (h / w)));
      if (previous) {
        this.mctx.drawImage(previous, 0, 0, this.mask.width, this.mask.height);
      }
      this.dirty = true;
    }
    return true;
  };

  /** Replicates object-fit: cover, which the canvas does not get for free. */
  Pane.prototype.cover = function () {
    var iw = this.img.naturalWidth || this.img.width;
    var ih = this.img.naturalHeight || this.img.height;
    var cw = this.canvas.width, ch = this.canvas.height;
    if (!iw || !ih) return null;

    var ir = iw / ih, cr = cw / ch, dw, dh;
    if (ir > cr) { dh = ch; dw = ch * ir; } else { dw = cw; dh = cw / ir; }
    return { x: (cw - dw) / 2, y: (ch - dh) / 2, w: dw, h: dh };
  };

  /** x/y in 0..1 pane space. */
  Pane.prototype.wipe = function (x, y, radius, strength) {
    var m = this.mask, mc = this.mctx;
    if (!m.width) return;

    var px = x * m.width;
    var py = y * m.height;
    var r = Math.max(2, radius * Math.min(m.width, m.height));

    mc.globalCompositeOperation = 'source-over';
    var g = mc.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(255,255,255,' + strength + ')');
    g.addColorStop(0.55, 'rgba(255,255,255,' + strength * 0.55 + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    mc.fillStyle = g;
    mc.fillRect(px - r, py - r, r * 2, r * 2);

    this.dirty = true;
    this.work += strength * radius * 6;
    if (!this.cleared && this.work > CFG.clearedAt) {
      this.cleared = true;
      this.frame.parentNode.parentNode.classList.add('is-cleared');
      remember(this.id);
    }
  };

  Pane.prototype.tick = function () {
    var m = this.mask, mc = this.mctx;
    if (!m.width) return;

    // Fog creeping back.
    mc.globalCompositeOperation = 'destination-out';
    mc.fillStyle = 'rgba(0,0,0,' + CFG.refog + ')';
    mc.fillRect(0, 0, m.width, m.height);
    this.dirty = true;

    // Run-off. Droplets clear a narrow trail on their way down, which means
    // the gallery keeps offering glimpses even when nobody touches it.
    if (this.drops.length < 3 && Math.random() < CFG.dropChance) {
      this.drops.push({
        x: Math.random(),
        y: -0.05,
        v: 0.0022 + Math.random() * 0.0055,
        r: 0.022 + Math.random() * 0.033,
        drift: (Math.random() - 0.5) * 0.0009
      });
    }
    for (var i = this.drops.length - 1; i >= 0; i--) {
      var d = this.drops[i];
      d.y += d.v;
      d.x += d.drift;
      this.wipe(d.x, d.y, d.r, 0.5);
      if (d.y > 1.08) this.drops.splice(i, 1);
    }
  };

  Pane.prototype.render = function () {
    if (!this.dirty || !this.ready) return;
    var ctx = this.ctx, c = this.canvas;
    var fit = this.cover();
    if (!fit) return;

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.img, fit.x, fit.y, fit.w, fit.h);

    // Keep only the wiped parts. The mask is tiny and scales up blurred,
    // which is what gives the wipe its soft condensation edge for free.
    ctx.globalCompositeOperation = 'destination-in';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.mask, 0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'source-over';

    this.dirty = false;
  };

  /** A soft pass so a piece is never a completely blank pane. */
  Pane.prototype.hint = function (strength) {
    this.wipe(0.5, 0.46, 0.42, strength);
  };

  /* ------------------------------------------------------------ the panes */

  var panes = [];

  function build() {
    var figures = document.querySelectorAll('.piece');
    for (var i = 0; i < figures.length; i++) {
      (function (fig) {
        var frame = fig.querySelector('.piece__frame');
        var img = fig.querySelector('.piece__image');
        var canvas = fig.querySelector('.piece__glass');
        if (!frame || !img || !canvas || !canvas.getContext) return;

        var pane = new Pane(frame, img, canvas, fig.getAttribute('data-id'));
        panes.push(pane);

        function start() {
          if (!pane.measure()) return;
          pane.ready = true;
          // Pieces you have already cleared open a little less opaque. The
          // glass remembers you were here, even if nothing else does.
          if (seen.indexOf(pane.id) !== -1) {
            pane.hint(0.5);
            pane.cleared = true;
            fig.classList.add('is-cleared');
          }
          pane.render();
        }

        if (img.complete && img.naturalWidth) start();
        else img.addEventListener('load', start, { once: true });

        // Wiping. Pointer events cover mouse, pen and touch in one path.
        frame.addEventListener('pointermove', function (ev) {
          if (!pane.ready) return;
          dismissPrompt();
          var r = frame.getBoundingClientRect();
          pane.wipe((ev.clientX - r.left) / r.width,
                    (ev.clientY - r.top) / r.height,
                    CFG.wipeRadius,
                    ev.pointerType === 'touch' ? 0.8 : 0.5);
        }, { passive: true });

        frame.addEventListener('pointerdown', function (ev) {
          if (!pane.ready) return;
          dismissPrompt();
          var r = frame.getBoundingClientRect();
          pane.wipe((ev.clientX - r.left) / r.width,
                    (ev.clientY - r.top) / r.height,
                    CFG.wipeRadius * 1.5, 0.95);
        }, { passive: true });
      })(figures[i]);
    }
  }

  /* ------------------------------------------------- visibility + the loop */

  function observe() {
    if (!('IntersectionObserver' in window)) {
      panes.forEach(function (p) { p.active = true; });
      document.querySelectorAll('.piece').forEach(function (f) { f.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var fig = entry.target;
        var pane = panes[parseInt(fig.getAttribute('data-index'), 10)];
        if (entry.isIntersecting) {
          fig.classList.add('is-visible');
          if (pane) {
            pane.active = true;
            // Touch has no hover, so arriving at a piece offers a glimpse.
            if (!pane.greeted && pane.ready && matchMedia('(hover: none)').matches) {
              pane.greeted = true;
              pane.hint(0.42);
            }
          }
        } else if (pane) {
          pane.active = false;
        }
      });
    }, { rootMargin: '15% 0px 15% 0px', threshold: 0.04 });

    document.querySelectorAll('.piece').forEach(function (f) { io.observe(f); });
  }

  var last = 0, interval = 1000 / CFG.fps;

  function loop(now) {
    requestAnimationFrame(loop);
    if (now - last < interval) return;
    last = now;

    // Nothing to draw while the glass is clear — the canvases are hidden, and
    // rendering fifteen of them anyway would cost battery for no picture.
    if (!fogOn) {
      if (plate.pane && plate.open) plate.tickPane();
      return;
    }

    for (var i = 0; i < panes.length; i++) {
      if (!panes[i].active || !panes[i].ready) continue;
      panes[i].tick();
      panes[i].render();
    }
    if (plate.pane && plate.open) { plate.tickPane(); }
  }

  /* ---------------------------------------------------------------- rail */

  function rail() {
    var fill = document.getElementById('railFill');
    if (!fill) return;
    var pending = false;
    function update() {
      pending = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
      fill.style.height = pct.toFixed(1) + '%';
    }
    window.addEventListener('scroll', function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------- lightbox */

  var plate = {
    open: false,
    index: -1,
    pane: null,
    items: [],

    init: function () {
      this.el = document.getElementById('plate');
      this.img = document.getElementById('plateImage');
      this.canvas = document.getElementById('plateGlass');
      this.title = document.getElementById('plateTitle');
      this.words = document.getElementById('plateWords');
      this.numeral = document.getElementById('plateNumeral');
      if (!this.el) return;

      var self = this;
      this.items = [].slice.call(document.querySelectorAll('.piece')).map(function (fig) {
        return {
          src: fig.querySelector('.piece__image').currentSrc
                 || fig.querySelector('.piece__image').getAttribute('src'),
          title: (fig.querySelector('.piece__title') || {}).textContent || '',
          words: (fig.querySelector('.piece__words') || {}).textContent || '',
          numeral: (fig.querySelector('.piece__numeral') || {}).textContent || '',
          id: fig.getAttribute('data-id')
        };
      });

      document.querySelectorAll('.piece__open').forEach(function (btn, i) {
        btn.addEventListener('click', function () { self.show(i); });
      });

      document.getElementById('plateClose').addEventListener('click', function () { self.hide(); });
      document.getElementById('platePrev').addEventListener('click', function () { self.step(-1); });
      document.getElementById('plateNext').addEventListener('click', function () { self.step(1); });
      this.el.addEventListener('click', function (ev) { if (ev.target === self.el) self.hide(); });

      document.addEventListener('keydown', function (ev) {
        if (!self.open) return;
        if (ev.key === 'Escape') self.hide();
        else if (ev.key === 'ArrowLeft') self.step(-1);
        else if (ev.key === 'ArrowRight') self.step(1);
      });

      this.canvas.parentNode.addEventListener('pointermove', function (ev) {
        if (!self.pane || !self.pane.ready) return;
        var r = self.canvas.getBoundingClientRect();
        self.pane.wipe((ev.clientX - r.left) / r.width,
                       (ev.clientY - r.top) / r.height, 0.16, 0.75);
      }, { passive: true });
    },

    show: function (i) {
      var item = this.items[i];
      if (!item) return;
      this.index = i;
      this.title.textContent = item.title;
      this.words.textContent = item.words;
      this.numeral.textContent = item.numeral;
      this.img.alt = item.title;

      var self = this;
      this.el.hidden = false;
      requestAnimationFrame(function () { self.el.classList.add('is-open'); });
      this.open = true;
      document.body.style.overflow = 'hidden';

      this.img.onload = function () { self.mount(item); };
      if (this.img.getAttribute('src') === item.src && this.img.complete) this.mount(item);
      else this.img.setAttribute('src', item.src);
    },

    mount: function (item) {
      if (root.classList.contains('no-glass')) { this.pane = null; return; }
      var pane = new Pane(this.canvas.parentNode, this.img, this.canvas, item.id);
      if (!pane.measure()) { this.pane = null; return; }
      pane.ready = true;
      // Opens clear. Then it starts going, from the edges in.
      pane.mctx.fillStyle = '#fff';
      pane.mctx.fillRect(0, 0, pane.mask.width, pane.mask.height);
      pane.render();
      this.pane = pane;
      remember(item.id);
    },

    /* Clarity decays from the edges inward — the middle is the last to go. */
    tickPane: function () {
      var p = this.pane;
      if (!p || !p.ready || !p.mask.width) return;
      var m = p.mask, mc = p.mctx;
      var cx = m.width / 2, cy = m.height / 2;

      mc.globalCompositeOperation = 'destination-out';
      var g = mc.createRadialGradient(cx, cy, Math.min(cx, cy) * 0.2,
                                      cx, cy, Math.max(cx, cy) * 1.15);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,' + CFG.plateRefog + ')');
      mc.fillStyle = g;
      mc.fillRect(0, 0, m.width, m.height);
      p.dirty = true;
      p.render();
    },

    step: function (dir) {
      var next = (this.index + dir + this.items.length) % this.items.length;
      this.show(next);
    },

    hide: function () {
      var self = this;
      this.open = false;
      this.pane = null;
      this.el.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { self.el.hidden = true; }, 700);
    }
  };

  /* ----------------------------------------------------------- the toggle */

  /**
   * The glass is off unless the visitor asks for it, and the choice sticks.
   *
   * Fog is the thing this gallery is *for*, but it is still fog in front of
   * somebody's drawings — a first-time visitor should see the work, decide
   * they like it, and only then be offered the trick.
   */
  /**
   * @param persist  Only true when the visitor actually operated the toggle.
   *   This used to save on every call, including the one during start-up — so
   *   the stored value recorded whatever the site had defaulted to that week,
   *   not a choice anyone made. Flipping the default then left every earlier
   *   visitor pinned to the old behaviour by a preference they never set.
   */
  function applyFog(on, btn, persist) {
    fogOn = on;
    root.classList.toggle('glass-on', on);
    root.classList.toggle('no-glass', !on);

    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'false' : 'true');
      btn.setAttribute('title', on ? 'Show every piece without the glass'
                                   : 'Put the glass back and wipe it yourself');
      btn.querySelector('.glass-toggle__label').textContent = on ? 'clear the glass' : 'let it fog';
    }

    // With no fog there is nothing to clear, so every caption reads at full
    // strength rather than waiting to be earned.
    if (!on) {
      document.querySelectorAll('.piece').forEach(function (f) { f.classList.add('is-cleared'); });
    }
    if (persist) {
      try { localStorage.setItem(FOG_KEY, on ? '1' : '0'); } catch (e) {}
    }
  }

  function toggle() {
    var btn = document.getElementById('glassToggle');
    if (!btn) return null;
    // The sweep of light is only there to be noticed. Once the visitor has
    // used the control, it has done its job and stops.
    var known = false;
    try { known = localStorage.getItem(TOUCHED_KEY) === '1'; } catch (e) {}
    if (known) btn.classList.add('is-known');

    btn.addEventListener('click', function () {
      // Turning fog *on* is a request to see it, so the prompt stays. Turning
      // it off means they are done with it.
      if (fogOn) dismissPrompt();
      applyFog(!fogOn, btn, true);
      btn.classList.add('is-known');
      try { localStorage.setItem(TOUCHED_KEY, '1'); } catch (e) {}
    });
    return btn;
  }

  /* ------------------------------------------------------------- the veil */

  function veil() {
    var el = document.getElementById('veil');
    if (!el) return;
    var already = false;
    try { already = sessionStorage.getItem('glass.veil') === '1'; } catch (e) {}

    if (already || reduced) { el.parentNode.removeChild(el); return; }

    var lifted = false;
    function lift() {
      if (lifted) return;
      lifted = true;
      el.classList.add('is-lifted');
      try { sessionStorage.setItem('glass.veil', '1'); } catch (e) {}
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2100);
    }
    setTimeout(lift, 2900);
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (evt) {
      window.addEventListener(evt, lift, { once: true, passive: true });
    });
  }

  /* ------------------------------------------------------------------ go */

  function init() {
    // We made it, so the head's safety net is no longer needed.
    clearTimeout(window.__glassFailsafe);

    // Undo the pre-paint hide. Anything that bails out below must call this,
    // or the wall stays blank.
    var reveal = function () { root.classList.remove('js-reveal'); };

    veil();
    rail();
    tally();
    var toggleBtn = toggle();
    plate.init();

    // The fog is the enhancement. If it cannot run, the art stays visible.
    if (reduced) {
      applyFog(false, toggleBtn, false);
      reveal();
      document.querySelectorAll('.piece').forEach(function (f) {
        f.classList.add('is-visible', 'is-cleared');
      });
      return;
    }

    build();
    if (!panes.length) { reveal(); return; }

    // The panes are built regardless so switching the fog on is instant, but
    // it stays clear until asked for.
    var stored = null;
    try { stored = localStorage.getItem(FOG_KEY); } catch (e) {}
    applyFog(stored === null ? true : stored === '1', toggleBtn, false);

    setupPrompt();
    observe();
    requestAnimationFrame(loop);

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        panes.forEach(function (p) { if (p.ready) { p.measure(); p.render(); } });
        if (plate.pane) { plate.pane.measure(); plate.pane.render(); }
      }, 180);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
