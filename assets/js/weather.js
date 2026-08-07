/* ==========================================================================
   The weather, and the sound of it.

   A room has weather, and this one gets a different one every time the door
   opens — rain, snow, mist, sun, wind, ash. Each is drawn on two canvases,
   one behind the work and one in front of it, because a single plane of
   falling things reads as wallpaper; it is the near layer, out of focus and
   twice as fast, that makes the room have a depth to stand in.

   Each weather is also a sound, in four layers that are always running at
   once: beds of filtered noise for the weather itself, a drone under
   everything and a held minor chord above it that never quite resolves, the
   small incidental sounds a room makes on its own — water off a sill, ice
   settling, a rope taking the strain — and over all of it an instrument,
   drawn fresh from the handful that suit the weather. Every note is played
   into seven seconds of reverb, so nothing ever entirely stops.

   Over the top of all four, every half-minute or so, something happens a
   long way off: an owl, a stone coming down a mountainside, a thin sound
   like wind on a far ridge, or a swell at forty hertz you do not so much
   hear as notice afterwards. These go out through a separate eleven-second
   reverb and almost nothing of them arrives dry, so what you are listening
   to is not the owl — it is how far away the owl is.

   All of it is synthesised here. There is not an audio file on the server,
   which is why a weather can be *tuned into* another one over three seconds
   rather than cut.

   Like the glass, every line of this is enhancement. Blocked, broken, or
   turned down for motion, the gallery is simply a gallery.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PICK_KEY  = 'weather.pick.v1';
  var SOUND_KEY = 'weather.sound.v1';

  var MAX_FPS = 40;          // soft particles gain nothing above this
  var REF_AREA = 1440 * 900; // particle counts are quoted for this screen

  /* ==================================================================
     The table.

     `far` and `near` are the two canvases. `n` is the particle count on a
     laptop screen, scaled by area at run time. Colours are bare `r,g,b`
     because they are interpolated into rgba() with a per-particle alpha.
     ================================================================== */

  // Also the order of the menu.
  var ORDER = ['rain', 'snow', 'mist', 'sun', 'wind', 'ash'];

  var WEATHER = {

    /* ------------------------------------------------------------ rain */
    rain: {
      name: 'rain',
      dot: '#8fb1d8',
      far: {
        mode: 'streak', n: 150, colour: '178,201,230', alpha: [0.12, 0.30],
        fall: [820, 1560], drift: -210, len: [10, 30], width: 1
      },
      near: {
        mode: 'streak', n: 11, colour: '198,218,242', alpha: [0.035, 0.075],
        fall: [1500, 2300], drift: -380, len: [70, 150], width: 2.6
      },
      gust: { amp: 0.30, period: 7.5 },
      sound: {
        // The hiss and the body of it. Rain is mostly high noise; the
        // bandpass underneath is what stops it sounding like tape static.
        beds: [
          { type: 'highpass', f: 1150, q: 0.5, g: 0.080, sway: [0.6, 1.5, 11] },
          { type: 'bandpass', f: 400,  q: 0.8, g: 0.048 }
        ],
        drone: { root: 55, stack: [1, 1.189, 1.5, 2], g: 0.050, cut: 340 },
        pad: { root: 110, stack: [1, 1.189, 1.5, 2, 2.378], g: 0.030, cut: 900 },
        // Water off a sill, into something. The loneliest sound there is.
        drip: { kind: 'drop', gap: [2.2, 7], f: [1500, 380], g: 0.10 },
        // Rain at night is the one that gets an owl.
        distant: ['owl', 'owl', 'abyss', 'keen'],
        voices: ['shakuhachi', 'koto', 'cedar', 'duduk', 'kalimba', 'bansuri'],
        reg: 1, gapMul: 0.7
      }
    },

    /* ------------------------------------------------------------ snow */
    snow: {
      name: 'snow',
      dot: '#dbe7f6',
      /* Flakes have to be big enough to be flakes. At a pixel across they are
         indistinguishable from stars, and a night sky is not weather. */
      far: {
        mode: 'blob', n: 130, colour: '226,238,252', alpha: [0.22, 0.68],
        size: [1.4, 4.2], soft: 0.3, fall: [16, 58], drift: -14,
        sway: { amp: [7, 26], period: [4, 11] }
      },
      near: {
        mode: 'blob', n: 9, colour: '232,242,255', alpha: [0.06, 0.13],
        size: [8, 18], soft: 0.02, fall: [70, 150], drift: -34,
        sway: { amp: [18, 46], period: [3, 7] }
      },
      gust: { amp: 0.55, period: 9 },
      sound: {
        // Snow is the sound of things being taken away. Everything is under
        // a low shelf; the only bright thing is the note, and it is rare.
        beds: [
          { type: 'lowpass', f: 620, q: 0.4, g: 0.022 },
          { type: 'lowpass', f: 190, q: 0.6, g: 0.032, sway: [0.5, 1.4, 17] }
        ],
        drone: { root: 65.41, stack: [1, 1.189, 2, 2.378], g: 0.046, cut: 260 },
        pad: { root: 130.81, stack: [1, 1.189, 1.5, 2.378, 3], g: 0.026, cut: 1100 },
        // Ice finding somewhere to settle.
        drip: { kind: 'tick', gap: [6, 16], f: [4200, 7000], g: 0.030 },
        distant: ['keen', 'abyss', 'stone'],
        voices: ['bonsho', 'glass', 'koto', 'shakuhachi', 'guqin'],
        reg: 1, gapMul: 1
      }
    },

    /* ------------------------------------------------------------ mist */
    mist: {
      name: 'mist',
      dot: '#9aa7b7',
      far: {
        mode: 'blob', n: 9, colour: '150,168,192', alpha: [0.045, 0.10],
        size: [180, 460], soft: 0.02, fall: [-4, 4], drift: -18,
        sway: { amp: [10, 40], period: [16, 34] }
      },
      near: {
        mode: 'blob', n: 3, colour: '158,175,198', alpha: [0.040, 0.075],
        size: [340, 700], soft: 0.01, fall: [-2, 2], drift: -30,
        sway: { amp: [20, 60], period: [20, 40] }
      },
      gust: { amp: 0.4, period: 21 },
      sound: {
        beds: [
          { type: 'lowpass', f: 300, q: 0.5, g: 0.030 },
          { type: 'lowpass', f: 110, q: 0.7, g: 0.042, sway: [0.6, 1.3, 23] }
        ],
        drone: { root: 41.20, stack: [1, 1.5, 1.782, 2, 3], g: 0.085, cut: 200 },
        pad: { root: 82.41, stack: [1, 1.189, 1.5, 2, 2.997], g: 0.034, cut: 620 },
        // Deeper and rarer than the rain's. This one is in a cave.
        drip: { kind: 'drop', gap: [5, 14], f: [900, 210], g: 0.115 },
        // Mist gets all four. It is the emptiest of the six and the only one
        // where you cannot see far enough to know what made the sound.
        distant: ['owl', 'abyss', 'keen', 'stone'],
        voices: ['bonsho', 'duduk', 'glass', 'gong', 'shakuhachi'],
        reg: 0.5, gapMul: 1.1
      }
    },

    /* ------------------------------------------------------------- sun */
    /* Not a bright day — a shaft through a window into a room nobody is in,
       and the dust you only see because of it. Warmth is the loneliest of
       these six, which is why it is here. */
    sun: {
      name: 'sun',
      dot: '#d8a878',
      far: {
        mode: 'blob', n: 90, colour: '244,219,182', alpha: [0.10, 0.42],
        size: [0.6, 1.9], soft: 0.35, fall: [-14, 8], drift: 9,
        sway: { amp: [6, 22], period: [7, 18] }, twinkle: [0.10, 0.30]
      },
      near: {
        mode: 'blob', n: 7, colour: '250,228,194', alpha: [0.035, 0.075],
        size: [5, 12], soft: 0.02, fall: [-22, 14], drift: 16,
        sway: { amp: [14, 40], period: [6, 14] }
      },
      gust: { amp: 0.25, period: 13 },
      sound: {
        beds: [
          { type: 'lowpass', f: 1800, q: 0.4, g: 0.014, sway: [0.5, 1.3, 19] },
          { type: 'lowpass', f: 240,  q: 0.5, g: 0.020 }
        ],
        // A major stack, but voiced so wide it never lands anywhere.
        drone: { root: 65.41, stack: [1, 1.5, 2.5, 3], g: 0.055, cut: 420 },
        pad: { root: 130.81, stack: [1, 1.5, 2.5, 3, 3.75], g: 0.028, cut: 1300 },
        // A warm house ticking. Nobody in it.
        drip: { kind: 'tick', gap: [9, 22], f: [2600, 4200], g: 0.022 },
        // No owl in daylight. Stone, heat and distance — a desert, not a night.
        distant: ['abyss', 'keen', 'stone', 'stone'],
        voices: ['kalimba', 'cedar', 'bansuri', 'guqin', 'glass'],
        reg: 1, gapMul: 0.85
      }
    },

    /* ------------------------------------------------------------ wind */
    wind: {
      name: 'wind',
      dot: '#a9bccf',
      far: {
        mode: 'streak', n: 150, colour: '190,206,226', alpha: [0.08, 0.24],
        fall: [30, 130], drift: -520, len: [12, 34], width: 1
      },
      near: {
        mode: 'streak', n: 10, colour: '206,220,238', alpha: [0.035, 0.08],
        fall: [40, 160], drift: -980, len: [80, 190], width: 2.2
      },
      gust: { amp: 0.85, period: 5.5 },
      sound: {
        // The cutoff sweep *is* the wind. Everything else is the room it is
        // getting into.
        beds: [
          { type: 'bandpass', f: 320, q: 1.4, g: 0.115, sweep: [130, 900, 9.5],
            sway: [0.45, 1.4, 6.5] },
          { type: 'lowpass',  f: 95,  q: 0.7, g: 0.048 }
        ],
        drone: { root: 49, stack: [1, 1.189, 1.5, 2.378], g: 0.048, cut: 300 },
        pad: { root: 98, stack: [1, 1.189, 1.5, 2.378, 2.997], g: 0.028, cut: 800 },
        // Something wooden taking the strain and letting it go again.
        drip: { kind: 'creak', gap: [8, 20], f: [170, 340], g: 0.075 },
        distant: ['keen', 'keen', 'stone', 'abyss'],
        voices: ['shakuhachi', 'duduk', 'gong', 'cedar', 'guqin'],
        reg: 0.5, gapMul: 0.9
      }
    },

    /* ------------------------------------------------------------- ash */
    ash: {
      name: 'ash',
      dot: '#b08a72',
      far: {
        mode: 'blob', n: 110, colour: '198,190,184', alpha: [0.15, 0.52],
        size: [1.4, 3.8], soft: 0.3, fall: [12, 46], drift: -22,
        sway: { amp: [12, 42], period: [3.5, 9] }, ember: 0.12
      },
      near: {
        mode: 'blob', n: 8, colour: '206,198,190', alpha: [0.05, 0.11],
        size: [7, 16], soft: 0.02, fall: [46, 110], drift: -46,
        sway: { amp: [22, 55], period: [3, 7] }, ember: 0.2
      },
      gust: { amp: 0.6, period: 8 },
      sound: {
        beds: [
          { type: 'lowpass', f: 520, q: 0.5, g: 0.036, sway: [0.5, 1.4, 13] },
          { type: 'bandpass', f: 88, q: 2.0, g: 0.044 }
        ],
        drone: { root: 43.65, stack: [1, 1.189, 1.414, 2], g: 0.078, cut: 220 },
        pad: { root: 87.31, stack: [1, 1.189, 1.414, 2, 2.378], g: 0.032, cut: 700 },
        // What is left of a fire, going out.
        drip: { kind: 'crackle', gap: [4, 12], f: [600, 2200], g: 0.045 },
        distant: ['stone', 'abyss', 'keen', 'owl'],
        voices: ['gong', 'bonsho', 'duduk', 'kalimba', 'cedar'],
        reg: 0.5, gapMul: 0.8
      }
    },

    /* --------------------------------------------------- nothing at all */
    /* Not an absence of a feature — the room with its weather taken off it.
       There is still a sound, because an empty room has one. */
    none: {
      name: 'nothing',
      dot: '#5b6474',
      far: null,
      near: null,
      sound: {
        beds: [{ type: 'lowpass', f: 150, q: 0.5, g: 0.016 }],
        drone: { root: 48.99, stack: [1, 1.5, 2], g: 0.042, cut: 180 },
        pad: { root: 98, stack: [1, 1.5, 2, 2.997], g: 0.024, cut: 560 },
        drip: { kind: 'drop', gap: [9, 24], f: [1100, 260], g: 0.085 },
        distant: ['owl', 'abyss', 'keen', 'stone'],
        voices: ['bonsho', 'glass', 'guqin'],
        reg: 0.5, gapMul: 1.2
      }
    }
  };

  function spec(key) { return WEATHER[key] || WEATHER.rain; }

  /* ==================================================================
     The instruments.

     A weather is a noise bed and a drone — that part is fixed, because rain
     sounds like rain. What is played *over* it is drawn fresh every time the
     page loads, from the handful of instruments that suit the weather. Rain
     with a shakuhachi over it is not the same room as rain with a cedar
     flute over it, and you cannot get the second one by waiting.

     Nothing here is a recording. Each instrument is a stack of partials, an
     envelope shape and a scale, which between them is most of what makes an
     instrument identifiable — an inharmonic partial at 2.76 is a thumb piano
     and there is no arguing with it.

     `scale` is semitones above the root, so the same intervals can be moved
     into whatever register the weather wants. The intervals are the point:
     the flat second in the In scale and in the duduk's Phrygian is where
     almost all of the sadness in this file actually lives.
     ================================================================== */

  var VOICES = {

    /* The In scale — [0,1,5,7,8] — is the sound most people mean when they
       say "Japanese". The instrument is mostly breath; the tone is what is
       left over. */
    shakuhachi: {
      name: 'shakuhachi', from: 'japan',
      root: 293.66, scale: [0, 1, 5, 7, 8], curve: 'flute',
      partials: [[1, 1], [2, 0.10], [3, 0.06], [4, 0.03]],
      attack: [0.35, 0.8], rel: [5, 9], g: 0.085,
      breath: 0.6, chiff: 0.10, vib: [4.8, 0.011, 1.0],
      bend: -0.9, glide: 0.42, cut: [6, 2.2, 1.0], gap: [8, 19]
    },

    /* A temple bell does not play a melody. It is struck, and then you wait
       out the hum tone, which is the partial an octave *below* the strike and
       the reason a bonshō sounds bottomless. */
    bonsho: {
      name: 'temple bell', from: 'japan',
      root: 55, scale: [0, 5], curve: 'bell',
      partials: [[0.5, 0.55], [1, 1], [2, 0.45], [2.98, 0.26], [4.15, 0.15], [5.43, 0.08]],
      attack: [0.006, 0.012], rel: [15, 24], g: 0.105,
      chiff: 0.28, cut: [9, 1.1, 0.9], gap: [24, 52]
    },

    koto: {
      name: 'koto', from: 'japan',
      root: 293.66, scale: [0, 1, 5, 7, 8], curve: 'pluck',
      partials: [[1, 1], [2, 0.30], [3, 0.13], [4.02, 0.06]],
      attack: [0.004, 0.009], rel: [2.6, 5], g: 0.080,
      chiff: 0.32, bend: 0.22, glide: 0.09, cut: [10, 2, 1.1], gap: [7, 16]
    },

    /* Plains flute. Minor pentatonic, and the grace note — a lower neighbour
       flicked in a twentieth of a second ahead of the real one — which is
       more of the style's signature than the timbre is. */
    cedar: {
      name: 'cedar flute', from: 'north america',
      root: 220, scale: [0, 3, 5, 7, 10], curve: 'flute',
      partials: [[1, 1], [2, 0.18], [3, 0.07]],
      attack: [0.12, 0.3], rel: [4, 7.5], g: 0.082,
      breath: 0.32, chiff: 0.2, vib: [5.5, 0.010, 0.55],
      grace: 0.45, cut: [7, 2.5, 1.0], gap: [7, 17]
    },

    /* Phrygian, for the flat second. A reed instrument is a sawtooth with
       almost everything above the third formant taken off it. */
    duduk: {
      name: 'duduk', from: 'armenia',
      root: 220, scale: [0, 1, 4, 5, 7, 8], curve: 'flute', wave: 'sawtooth',
      partials: [[1, 1], [2, 0.5], [3, 0.28], [4, 0.12]],
      attack: [0.25, 0.5], rel: [6, 11], g: 0.062,
      breath: 0.18, vib: [5.2, 0.016, 0.85], cut: [3.2, 1.5, 4], gap: [9, 20]
    },

    /* The meend: the note is entered from a whole tone below and slid up
       into. Take that away and it is just a flute. */
    bansuri: {
      name: 'bansuri', from: 'india',
      root: 293.66, scale: [0, 1, 5, 7, 10], curve: 'flute',
      partials: [[1, 1], [2, 0.22], [3, 0.08]],
      attack: [0.2, 0.45], rel: [5, 9], g: 0.080,
      breath: 0.42, vib: [6, 0.013, 0.6], grace: 0.3,
      bend: -2, glide: 0.55, cut: [6, 2.4, 1.0], gap: [8, 18]
    },

    /* Plucked, then bent afterwards — the string is pushed while it is still
       ringing. Almost every guqin phrase does this. */
    guqin: {
      name: 'guqin', from: 'china',
      root: 146.83, scale: [0, 2, 5, 7, 9], curve: 'pluck',
      partials: [[1, 1], [2, 0.26], [3, 0.09], [4, 0.04]],
      attack: [0.005, 0.012], rel: [4.5, 8], g: 0.078,
      chiff: 0.34, slide: [1.6, 0.5, 1.4], cut: [8, 1.8, 1.0], gap: [9, 21]
    },

    /* The partial at 2.76 is a struck metal tine and nothing else. */
    kalimba: {
      name: 'kalimba', from: 'east africa',
      root: 440, scale: [0, 3, 5, 7, 10], curve: 'pluck',
      partials: [[1, 1], [2.76, 0.30], [5.4, 0.10]],
      attack: [0.003, 0.007], rel: [1.3, 2.6], g: 0.075,
      chiff: 0.24, cut: [8, 3, 1.0], gap: [7, 16]
    },

    /* Shimmer is two of everything, three cents apart. The beating between
       them is the whole sound of a gamelan. */
    gong: {
      name: 'gong', from: 'java',
      root: 73.42, scale: [0, 2, 7], curve: 'bell',
      partials: [[1, 1], [1.5, 0.28], [2.04, 0.40], [2.9, 0.22], [4.1, 0.12]],
      attack: [0.02, 0.05], rel: [11, 20], g: 0.090,
      chiff: 0.3, shimmer: 0.7, cut: [7, 1.3, 0.9], gap: [20, 44]
    },

    /* Wet fingers on a glass rim. Three seconds to arrive, which is longer
       than most visitors will have realised a note can take. */
    glass: {
      name: 'glass', from: 'europe',
      root: 440, scale: [0, 3, 7, 10], curve: 'bow',
      partials: [[1, 1], [2, 0.14], [3, 0.05]],
      attack: [2, 3.6], rel: [7, 13], g: 0.062,
      vib: [3.2, 0.005, 2], shimmer: 0.3, cut: [5, 2, 1.0], gap: [12, 26]
    }
  };

  /* --------------------------------------------------------------- utils */

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pair(v, i) { return Array.isArray(v) ? rand(v[0], v[1]) : v; }

  var current = (function () {
    var w = root.getAttribute('data-weather');
    return WEATHER[w] ? w : 'rain';
  })();

  /* ==================================================================
     The sky.

     Two canvases, one particle model, two ways of drawing it: a `streak`
     is stroked along its own velocity so it slants with the wind, a `blob`
     is a pre-tinted sprite scaled to size. Positions are in CSS pixels and
     the device ratio lives in the transform, so nothing below has to think
     about it.
     ================================================================== */

  var Sky = {
    layers: [],
    running: false,
    gust: { v: 0, t: 0, amp: 0, period: 8 },

    init: function () {
      if (reduced) return;
      var far = document.getElementById('weatherFar');
      var near = document.getElementById('weatherNear');
      if (!far || !near || !far.getContext) return;

      this.layers = [
        { canvas: far,  ctx: far.getContext('2d'),  which: 'far',  parts: [] },
        { canvas: near, ctx: near.getContext('2d'), which: 'near', parts: [] }
      ];
      this.measure();
      this.populate(current);
      this.running = true;
      // Bound once. Binding inside the loop allocates a closure sixty times a
      // second for the life of the page.
      this.next = this.frame.bind(this);
      requestAnimationFrame(this.next);
      return true;
    },

    measure: function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var w = window.innerWidth, h = window.innerHeight;
      this.layers.forEach(function (L) {
        L.w = w; L.h = h; L.dpr = dpr;
        L.canvas.width = Math.round(w * dpr);
        L.canvas.height = Math.round(h * dpr);
        L.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
    },

    /* Counts are quoted for a laptop. Clamped rather than scaled straight so
       a phone still gets weather and a 5K display does not get four thousand
       snowflakes. */
    scale: function (L) {
      return Math.max(0.34, Math.min(1.5, (L.w * L.h) / REF_AREA));
    },

    populate: function (key) {
      var s = spec(key);
      this.gust.amp = s.gust ? s.gust.amp : 0;
      this.gust.period = s.gust ? s.gust.period : 8;

      var self = this;
      this.layers.forEach(function (L) {
        L.spec = s[L.which];
        L.parts = [];
        if (!L.spec) return;
        var n = Math.round(L.spec.n * self.scale(L));
        for (var i = 0; i < n; i++) L.parts.push(self.seed(L));
      });
    },

    seed: function (L) {
      var sp = L.spec;
      var p = {
        x: rand(-40, L.w + 40),
        y: rand(-40, L.h + 40),
        a: rand(sp.alpha[0], sp.alpha[1]),
        vy: pair(sp.fall),
        vx: sp.drift * rand(0.6, 1.4),
        ph: rand(0, Math.PI * 2)
      };

      if (sp.mode === 'streak') {
        p.len = pair(sp.len);
      } else {
        p.r = pair(sp.size);
        p.swayA = sp.sway ? pair(sp.sway.amp) : 0;
        p.swayF = sp.sway ? (Math.PI * 2) / pair(sp.sway.period) : 0;
        p.tw = sp.twinkle ? pair(sp.twinkle) : 0;
        // A few of the flecks are still warm. They are the only thing on the
        // page that is dying rather than falling.
        p.rgb = (sp.ember && Math.random() < sp.ember) ? '196,124,84' : sp.colour;
      }
      return p;
    },

    /* Wind arrives and leaves. A constant sideways push reads as a broken
       gravity; a slow swell reads as air. */
    breathe: function (dt) {
      var g = this.gust;
      g.t += dt;
      var slow = Math.sin((g.t / g.period) * Math.PI * 2);
      var fast = Math.sin((g.t / (g.period * 0.37)) * Math.PI * 2 + 1.7);
      g.v = 1 + g.amp * (slow * 0.72 + fast * 0.28);
    },

    step: function (L, dt, t) {
      var sp = L.spec, g = this.gust.v, i, p, pad;
      if (!sp) return;

      for (i = 0; i < L.parts.length; i++) {
        p = L.parts[i];
        p.x += p.vx * g * dt;
        p.y += p.vy * dt;

        if (sp.mode === 'blob' && p.swayA) {
          // Lateral sway is a velocity, not an offset added to x — added, it
          // fights the drift and the particle appears to shiver in place.
          p.x += Math.cos(t * p.swayF + p.ph) * p.swayA * dt;
        }

        /* Wrapped on whichever edge it actually left, rather than reseeded
           wholesale. Mist crosses the room at eighteen pixels a second and a
           blown-back particle has to come round the other side at the height
           it left, or the fog visibly thins on one side of the screen and
           gathers on the other. Only a fall off the top or bottom earns a
           fresh x, because that is the one case where nobody can tell. */
        pad = (sp.mode === 'streak' ? p.len : p.r) + 40;
        if (p.y - pad > L.h)          { p.y = -pad; p.x = rand(-40, L.w + 40); }
        else if (p.y + pad < 0)       { p.y = L.h + pad; p.x = rand(-40, L.w + 40); }
        else if (p.x - pad > L.w)     { p.x = -pad; }
        else if (p.x + pad < 0)       { p.x = L.w + pad; }
      }
    },

    draw: function (L, t) {
      var sp = L.spec, ctx = L.ctx, i, p, k;
      ctx.clearRect(0, 0, L.w, L.h);
      if (!sp) return;

      if (sp.mode === 'streak') {
        ctx.lineCap = 'round';
        ctx.lineWidth = sp.width;
        ctx.strokeStyle = 'rgb(' + sp.colour + ')';
        for (i = 0; i < L.parts.length; i++) {
          p = L.parts[i];
          // Drawn along the velocity vector, so the slant is the wind's and
          // not a number somebody guessed.
          k = p.len / Math.max(1, Math.hypot(p.vx * this.gust.v, p.vy));
          ctx.globalAlpha = p.a;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * this.gust.v * k, p.y - p.vy * k);
          ctx.stroke();
        }
      } else {
        for (i = 0; i < L.parts.length; i++) {
          p = L.parts[i];
          // Dust is only visible when it turns. Without this the motes are a
          // static field of dots that happens to move.
          ctx.globalAlpha = p.tw
            ? p.a * (1 - p.tw + p.tw * (0.5 + 0.5 * Math.sin(t * 1.6 + p.ph * 3)))
            : p.a;
          ctx.drawImage(sprite(p.rgb, sp.soft), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        }
      }
      ctx.globalAlpha = 1;
    },

    frame: function (now) {
      requestAnimationFrame(this.next);
      if (!this.running || document.hidden) { this.last = 0; return; }

      if (!this.last) this.last = now;
      var dt = (now - this.last) / 1000;
      if (dt < 1 / MAX_FPS) return;
      this.last = now;
      // A backgrounded tab hands back one enormous frame. Uncapped, every
      // particle teleports off screen and the sky empties itself.
      if (dt > 0.05) dt = 0.05;

      var t = now / 1000;
      this.breathe(dt);
      for (var i = 0; i < this.layers.length; i++) {
        this.step(this.layers[i], dt, t);
        this.draw(this.layers[i], t);
      }
    }
  };

  /* Soft round particles, pre-tinted, cached by colour and edge hardness.
     Tinting at draw time is not possible with drawImage, and a radial
     gradient per particle per frame is the one thing that would actually
     cost something here. */
  var sprites = {};

  function sprite(rgb, soft) {
    var key = rgb + '|' + soft;
    if (sprites[key]) return sprites[key];

    // A snowflake is drawn at a pixel and a half and a bank of fog at nine
    // hundred. Sampling a 128px sprite down to 1.5px, a hundred times a frame,
    // is work for nothing — so a hard-edged particle gets a small sprite and
    // only the diffuse ones, which are the ones being scaled *up*, get a big
    // one.
    var R = soft >= 0.2 ? 16 : 64;
    var c = document.createElement('canvas');
    c.width = c.height = R * 2;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, 'rgba(' + rgb + ',1)');
    g.addColorStop(Math.max(0.01, soft), 'rgba(' + rgb + ',0.62)');
    g.addColorStop(0.62, 'rgba(' + rgb + ',0.16)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, R * 2, R * 2);

    sprites[key] = c;
    return c;
  }

  /* ==================================================================
     The sound.

     Nothing is loaded. The noise beds, the reverb tail and every note are
     generated the first time the visitor asks for sound, which is also the
     only moment a browser will let an AudioContext start.
     ================================================================== */

  var Sound = {
    ctx: null,
    on: false,
    ready: false,
    beds: [],
    partials: [],
    timer: null,

    /* -------------------------------------------------------- the graph */

    build: function () {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      var ctx = this.ctx = new AC();

      this.master = ctx.createGain();
      this.master.gain.value = 0;

      // Nothing here should ever be able to clip, whatever the weather does
      // to the drone while a note is landing.
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      this.master.connect(comp);
      comp.connect(ctx.destination);

      // One bus, split dry and wet. The room is deliberately enormous — seven
      // seconds of tail is what carries a note that has stopped through to the
      // next one, and it is the difference between a page that plays sounds
      // and a page that is never quiet.
      this.bus = ctx.createGain();
      this.dry = ctx.createGain();
      this.wet = ctx.createGain();
      this.dry.gain.value = 0.60;
      this.wet.gain.value = 0.80;

      var verb = ctx.createConvolver();
      verb.buffer = this.tail(7, 2);
      this.bus.connect(this.dry); this.dry.connect(this.master);
      this.bus.connect(this.wet); this.wet.connect(verb); verb.connect(this.master);

      // Far end of the same room, for the drips. Almost nothing of these
      // reaches the master directly — what you hear is the reflection, which
      // is what makes a single drop sound like it is somewhere else.
      this.room = ctx.createGain();
      var near = ctx.createGain();
      near.gain.value = 0.30;
      this.room.connect(near); near.connect(this.master);
      this.room.connect(this.wet);

      /* And the gulf: a second, far larger room — eleven seconds of tail,
         and only a sixth of the signal arriving dry — used by nothing except
         the distant layer.

         This is where the emptiness actually comes from. An owl put through
         a normal reverb is an owl in a room. The same owl through this is an
         owl somewhere across a valley, and what you are listening to is not
         the owl, it is how far away it is. */
      this.gulf = ctx.createGain();
      var dry = ctx.createGain();
      dry.gain.value = 0.16;
      var canyon = ctx.createConvolver();
      this.gulf.connect(dry); dry.connect(this.master);
      this.gulf.connect(canyon); canyon.connect(this.master);

      // Eleven seconds of stereo noise is a million samples to shape, and all
      // of this runs inside the click that also opens the gallery. Nothing
      // goes through the gulf for at least nine seconds, so it is built on the
      // next tick rather than in the way.
      var self = this;
      setTimeout(function () { canyon.buffer = self.tail(11, 1.5); }, 0);

      // Two identical noise layers. Which is rain and which is wind is
      // entirely a matter of what tune() does to the filters.
      var buf = this.noise(3);
      for (var i = 0; i < 2; i++) {
        var src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        var filter = ctx.createBiquadFilter();
        var gain = ctx.createGain();
        gain.gain.value = 0;
        src.connect(filter); filter.connect(gain); gain.connect(this.bus);
        src.start(ctx.currentTime + i * 0.37);   // offset, or the two beds phase-lock
        this.beds.push({ src: src, filter: filter, gain: gain, lfo: null, sweep: null });
      }

      /* Two banks of held tone. The drone sits under everything at the bottom
         of hearing, where it is felt rather than heard. The pad is two octaves
         up, in the register sadness actually lives in — a low rumble is
         weather, but a held minor chord at two hundred hertz is a mood, and it
         is the thing that is *always there* between the notes. */
      this.droneCut = ctx.createBiquadFilter();
      this.droneCut.type = 'lowpass';
      this.droneCut.frequency.value = 300;
      this.droneCut.connect(this.bus);
      this.partials = this.bank(5, this.droneCut, 0.017, 0.011);

      this.padCut = ctx.createBiquadFilter();
      this.padCut.type = 'lowpass';
      this.padCut.frequency.value = 900;
      this.padCut.connect(this.bus);
      // Slower clocks than the drone: a pad voice takes two minutes to come up
      // and go away again, so the chord is never the same twice and you can
      // never catch it changing.
      this.pads = this.bank(5, this.padCut, 0.008, 0.0055);

      this.ready = true;
      return true;
    },

    /** A bank of oscillators, each swelling on its own slow clock. */
    bank: function (n, dest, base, step) {
      var ctx = this.ctx, out = [];
      for (var v = 0; v < n; v++) {
        var osc = ctx.createOscillator();
        osc.type = v % 2 ? 'triangle' : 'sine';
        osc.frequency.value = 110;
        osc.detune.value = (v - (n - 1) / 2) * 4;
        var g = ctx.createGain();
        g.gain.value = 0;
        osc.connect(g); g.connect(dest);
        osc.start();

        // The beating between voices is the whole difference between a chord
        // and a test tone.
        var lfo = ctx.createOscillator();
        lfo.frequency.value = base + v * step;
        var depth = ctx.createGain();
        depth.gain.value = 0;
        lfo.connect(depth); depth.connect(g.gain);
        lfo.start();

        out.push({ osc: osc, gain: g, depth: depth });
      }
      return out;
    },

    /* Pink rather than white — white noise under a filter still sounds like
       a hiss, pink sounds like air. Kellet's approximation, which is cheap
       and close enough for something that is going to be filtered anyway. */
    noise: function (seconds) {
      var ctx = this.ctx;
      var len = Math.floor(ctx.sampleRate * seconds);
      var buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var d = buf.getChannelData(ch);
        var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (var i = 0; i < len; i++) {
          var w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.0168980;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        }
      }
      return buf;
    },

    /* A room, made out of noise that runs out. The pre-delay is what tells
       the ear the far wall is far. */
    tail: function (seconds, decay) {
      var ctx = this.ctx;
      var len = Math.floor(ctx.sampleRate * seconds);
      var pre = Math.floor(ctx.sampleRate * 0.045);
      var buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var d = buf.getChannelData(ch);
        for (var i = pre; i < len; i++) {
          var t = (i - pre) / (len - pre);
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
        }
      }
      return buf;
    },

    /* ------------------------------------------------------- the weather */

    /**
     * Move the whole graph to another weather over `ramp` seconds.
     *
     * Filter *type* is the one parameter with no ramp — it is an enum, not
     * an AudioParam. So a bed whose type is changing is taken to silence
     * first, switched while it cannot be heard, and brought back.
     */
    tune: function (key, ramp) {
      if (!this.ready) return;
      var s = spec(key).sound, ctx = this.ctx, now = ctx.currentTime, self = this;
      ramp = ramp || 0.05;

      this.beds.forEach(function (bed, i) {
        var want = s.beds[i];
        var live = self.on ? 1 : 0;

        if (bed.lfo) { bed.lfo.stop(); bed.lfo = null; }
        if (bed.sweep) { bed.sweep.stop(); bed.sweep = null; }
        // A weather changed twice inside three seconds would otherwise leave
        // an earlier swap still pending, and it lands after this one — the
        // room ends up with the sound of the weather before last.
        if (bed.swap) { clearTimeout(bed.swap); bed.swap = null; }

        if (!want) {
          bed.gain.gain.linearRampToValueAtTime(0, now + ramp);
          return;
        }

        var apply = function () {
          var t = ctx.currentTime;
          bed.filter.type = want.type;
          bed.filter.frequency.setTargetAtTime(want.f, t, 0.4);
          bed.filter.Q.setTargetAtTime(want.q, t, 0.4);
          bed.gain.gain.linearRampToValueAtTime(want.g * live, t + ramp * 0.5);

          // A slow random-ish swell, so the rain gets heavier and eases off.
          if (want.sway) {
            var lfo = ctx.createOscillator();
            var dep = ctx.createGain();
            lfo.frequency.value = 1 / want.sway[2];
            dep.gain.value = want.g * live * (want.sway[1] - want.sway[0]) * 0.5;
            lfo.connect(dep); dep.connect(bed.gain.gain);
            lfo.start();
            bed.lfo = lfo;
          }
          // Wind is a cutoff moving, not a volume moving.
          if (want.sweep) {
            var sw = ctx.createOscillator();
            var sd = ctx.createGain();
            sw.frequency.value = 1 / want.sweep[2];
            sd.gain.value = (want.sweep[1] - want.sweep[0]) / 2;
            bed.filter.frequency.setTargetAtTime((want.sweep[0] + want.sweep[1]) / 2, ctx.currentTime, 0.4);
            sw.connect(sd); sd.connect(bed.filter.frequency);
            sw.start();
            bed.sweep = sw;
          }
        };

        if (bed.filter.type !== want.type) {
          bed.gain.gain.linearRampToValueAtTime(0, now + ramp * 0.45);
          bed.swap = setTimeout(apply, ramp * 470);
        } else {
          apply();
        }
      });

      this.droneCut.frequency.setTargetAtTime(s.drone.cut, now, ramp * 0.4);
      this.padCut.frequency.setTargetAtTime(s.pad.cut, now, ramp * 0.4);
      this.chord(this.partials, s.drone, ramp);
      this.chord(this.pads, s.pad, ramp);

      this.drip = s.drip;
      this.faraway = s.distant;
      if (this.on) { this.drips(true); this.distant(true); this.drift(); }

      this.reg = s.reg || 1;
      this.gapMul = s.gapMul || 1;
      this.pool = s.voices;
      this.pick();
      if (this.on) this.schedule(true);
    },

    /** Move a bank of held tone onto another chord, slowly enough to miss. */
    chord: function (voices, d, ramp) {
      var now = this.ctx.currentTime, live = this.on ? 1 : 0;
      voices.forEach(function (p, i) {
        p.osc.frequency.setTargetAtTime(d.root * d.stack[i % d.stack.length],
                                        now, ramp * 0.5);
        // Any voice past the end of the stack is silent — a four-note chord
        // in a five-voice bank leaves one voice out rather than doubling one.
        var g = i < d.stack.length ? d.g * live : 0;
        p.gain.gain.setTargetAtTime(g * 0.62, now, ramp * 0.5);
        p.depth.gain.setTargetAtTime(g * 0.38, now, ramp * 0.5);
      });
    },

    /**
     * Draw the instrument for this weather.
     *
     * Never the same one twice running while a pool has an alternative — a
     * feature whose whole point is that it varies has to be *seen* to vary,
     * and a coin that comes up shakuhachi twice reads as no feature at all.
     */
    pick: function (force) {
      if (!this.pool || !this.pool.length) return;
      var was = this.voice && this.voice.name;
      var pool = this.pool.filter(function (k) { return VOICES[k].name !== was; });
      if (!pool.length) pool = this.pool;
      this.voice = VOICES[pool[Math.floor(Math.random() * pool.length)]];
      if (this.onvoice) this.onvoice(this.voice, force);
    },

    /* ----------------------------------------------------------- a note */

    schedule: function (soon) {
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      if (!this.on || !this.voice) return;
      var self = this;
      var v = this.voice;
      // On a weather change the clock is not reset to a full wait, or the
      // first half-minute of the new weather has nothing in it.
      var wait = soon ? rand(2.5, 6) : rand(v.gap[0], v.gap[1]) * this.gapMul;
      this.timer = setTimeout(function () {
        self.strike();
        self.schedule();
      }, wait * 1000);
    },

    /**
     * One note, built from the current voice.
     *
     * Everything below is per-note and thrown away: a dozen nodes every ten
     * or twenty seconds is nothing, and it is far simpler than keeping a
     * voice allocated and re-triggering it.
     */
    strike: function (freq, when, level) {
      if (!this.on || !this.ready || !this.voice) return;
      var ctx = this.ctx, v = this.voice;
      var t = when || ctx.currentTime;

      var f = freq;
      if (!f) {
        var deg = v.scale[Math.floor(Math.random() * v.scale.length)];
        // Sometimes it answers itself an octave away. Bells and gongs stay
        // where they are — a temple bell has one pitch.
        var oct = (v.curve !== 'bell' && Math.random() < 0.3)
                    ? (Math.random() < 0.62 ? -1 : 1) : 0;
        f = v.root * this.reg * Math.pow(2, deg / 12 + oct);

        // A lower neighbour flicked in ahead of the real note. The grace goes
        // now and the note it belongs to is pushed back behind it — nothing
        // can be scheduled into the past, so the ornament cannot be moved
        // earlier, only the note later.
        if (v.grace && Math.random() < v.grace) {
          this.strike(f * Math.pow(2, -2 / 12), t, 0.4);
          t += 0.075;
        }
      }

      var att = rand(v.attack[0], v.attack[1]);
      var rel = rand(v.rel[0], v.rel[1]);
      var peak = v.g * (level || rand(0.6, 1));
      var end = t + att + rel;

      /* ------------------------------------------------------- the shape */

      var env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(peak, t + att);
      if (v.curve === 'flute') {
        // Blown notes swell, settle back, and are let go of.
        env.gain.linearRampToValueAtTime(peak * 0.72, t + att + rel * 0.45);
      } else if (v.curve === 'bow') {
        env.gain.linearRampToValueAtTime(peak, t + att + rel * 0.3);
      }
      // Exponential, because a linear fall is audible as a switch closing —
      // and never to zero, which the method will not accept.
      env.gain.exponentialRampToValueAtTime(0.0001, end);

      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = v.cut[2];
      lp.frequency.setValueAtTime(Math.min(18000, f * v.cut[0]), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(90, f * v.cut[1]), end);
      env.connect(lp);

      if (ctx.createStereoPanner) {
        var pan = ctx.createStereoPanner();
        pan.pan.value = rand(-0.6, 0.6);               // it comes from somewhere
        lp.connect(pan); pan.connect(this.bus);
      } else {
        lp.connect(this.bus);
      }

      /* ------------------------------------------------------ the pitch */

      // One vibrato for the whole note, arriving late — a vibrato present
      // from the first instant is a synthesiser, not a player.
      var vib = null;
      if (v.vib) {
        vib = ctx.createOscillator();
        vib.frequency.value = v.vib[0];
        vib.start(t);
        vib.stop(end + 0.2);
      }

      v.partials.forEach(function (p) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = v.wave || 'sine';
        g.gain.value = p[1];
        o.connect(g); g.connect(env);

        var pf = f * p[0];
        if (v.bend) {
          // Entered from below (or above) and slid into.
          o.frequency.setValueAtTime(pf * Math.pow(2, v.bend / 12), t);
          o.frequency.exponentialRampToValueAtTime(pf, t + v.glide);
        } else {
          o.frequency.setValueAtTime(pf, t);
        }
        if (v.slide) {
          // Bent after the attack, while it is still ringing.
          o.frequency.setValueAtTime(pf, t + v.slide[1]);
          o.frequency.exponentialRampToValueAtTime(
            pf * Math.pow(2, v.slide[0] / 12), t + v.slide[1] + v.slide[2]);
        }
        if (vib) {
          var d = ctx.createGain();
          d.gain.setValueAtTime(0, t);
          d.gain.setValueAtTime(0, t + v.vib[2]);
          d.gain.linearRampToValueAtTime(pf * v.vib[1], t + v.vib[2] + 0.9);
          vib.connect(d); d.connect(o.frequency);
        }
        o.start(t);
        o.stop(end + 0.2);

        // Two of everything, a few cents apart. What you hear is not the
        // detuning, it is the slow beat between them.
        if (v.shimmer) {
          var o2 = ctx.createOscillator();
          var g2 = ctx.createGain();
          o2.type = o.type;
          o2.frequency.setValueAtTime(pf, t);
          o2.detune.value = v.shimmer * (Math.random() < 0.5 ? -8 : 8);
          g2.gain.value = p[1] * 0.7;
          o2.connect(g2); g2.connect(env);
          o2.start(t);
          o2.stop(end + 0.2);
        }
      });

      /* ------------------------------------------------- breath and chiff */

      if (v.breath) this.air(t, end, f * 1.9, 1.4, peak * v.breath * 0.55, att);
      if (v.chiff)  this.air(t, t + 0.14, f * 3, 1.0, peak * v.chiff, 0.008);
    },

    /* ================================================================
       The drips.

       Between the notes there has to be something, or the page is a drone
       with occasional flute over it and the ear gives up on it. These are
       the small incidental sounds a room makes on its own: water off a
       sill, ice settling, a rope taking the strain, a fire going out.

       All of them go out through `far`, so almost nothing of them arrives
       dry. What you hear is the reflection, which is what makes a single
       drop sound like it is happening somewhere you are not.
       ================================================================ */

    drips: function (soon) {
      clearTimeout(this.dtimer);
      this.dtimer = null;
      if (!this.on || !this.drip) return;
      var self = this;
      // Read off `self.drip` at fire time, not off a captured copy — the
      // weather can change between scheduling and landing.
      var wait = soon ? rand(0.8, 3) : rand(this.drip.gap[0], this.drip.gap[1]);
      this.dtimer = setTimeout(function () {
        var d = self.drip;
        if (!d) return;
        if (d.kind === 'drop') self.drop(d);
        else if (d.kind === 'tick') self.tick(d);
        else if (d.kind === 'creak') self.creak(d);
        else self.crackle(d);
        self.drips();
      }, wait * 1000);
    },

    /** Somewhere to send a small sound so it arrives from over there. */
    place: function (node) {
      var ctx = this.ctx;
      if (ctx.createStereoPanner) {
        var p = ctx.createStereoPanner();
        p.pan.value = rand(-0.85, 0.85);
        node.connect(p); p.connect(this.room);
      } else {
        node.connect(this.room);
      }
    },

    /** The same, but out across the gulf. `pan` is passed for a phrase that
        has to come from one place — three hoots from three directions is
        three owls, and there is only ever one. */
    afar: function (node, pan) {
      var ctx = this.ctx;
      if (ctx.createStereoPanner) {
        var p = ctx.createStereoPanner();
        p.pan.value = pan === undefined ? rand(-0.85, 0.85) : pan;
        node.connect(p); p.connect(this.gulf);
      } else {
        node.connect(this.gulf);
      }
    },

    /* A falling pitch is the whole trick. Water landing in water drops about
       two octaves in fifty milliseconds as the bubble it made collapses, and
       the ear reads that fall as "drop" before it reads anything else. */
    drop: function (d) {
      var ctx = this.ctx, t = ctx.currentTime;
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(d.f[0] * rand(0.72, 1.4), t);
      o.frequency.exponentialRampToValueAtTime(d.f[1] * rand(0.8, 1.25), t + rand(0.04, 0.075));

      var g = ctx.createGain();
      var fall = rand(0.16, 0.36);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(d.g * rand(0.45, 1), t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + fall);

      o.connect(g);
      this.place(g);
      o.start(t);
      o.stop(t + fall + 0.1);
    },

    /** Ice, or a cooling house. A single narrow click and nothing after it. */
    tick: function (d) {
      var ctx = this.ctx, t = ctx.currentTime;
      var src = ctx.createBufferSource();
      src.buffer = this.beds[0].src.buffer;

      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = rand(d.f[0], d.f[1]);
      bp.Q.value = 7;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(d.g * rand(0.4, 1), t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

      src.connect(bp); bp.connect(g);
      this.place(g);
      src.start(t, Math.random() * (src.buffer.duration - 0.4));
      src.stop(t + 0.25);
    },

    /* Wood under load. A very narrow band of noise whose centre climbs while
       it swells — the pitch rising as the strain increases is what stops it
       being a whoosh. */
    creak: function (d) {
      var ctx = this.ctx, t = ctx.currentTime;
      var len = rand(1.1, 2.6);
      var src = ctx.createBufferSource();
      src.buffer = this.beds[0].src.buffer;
      src.loop = true;

      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 15;
      var from = rand(d.f[0], d.f[1]);
      bp.frequency.setValueAtTime(from, t);
      bp.frequency.exponentialRampToValueAtTime(from * rand(1.3, 2.2), t + len);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(d.g * rand(0.5, 1), t + len * 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);

      src.connect(bp); bp.connect(g);
      this.place(g);
      src.start(t, Math.random() * (src.buffer.duration - 0.4));
      src.stop(t + len + 0.2);
    },

    /** Embers: a handful of tiny clicks scattered over half a second. */
    crackle: function (d) {
      var ctx = this.ctx, n = 3 + Math.floor(Math.random() * 6);
      for (var i = 0; i < n; i++) {
        var t = ctx.currentTime + Math.random() * 0.55;
        var src = ctx.createBufferSource();
        src.buffer = this.beds[0].src.buffer;

        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = rand(d.f[0], d.f[1]);
        bp.Q.value = 3;

        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(d.g * rand(0.25, 1), t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.03, 0.1));

        src.connect(bp); bp.connect(g);
        this.place(g);
        src.start(t, Math.random() * (src.buffer.duration - 0.4));
        src.stop(t + 0.25);
      }
    },

    /* ================================================================
       The distance.

       Four things that happen a long way off, every half-minute or so, all
       of them out through the gulf. The drips say the room is real; these
       say how big it is and that there is nobody in it.

       Rarity is the whole design. An owl once a minute is an owl. An owl
       every fifteen seconds is a clock, and a clock is company.
       ================================================================ */

    distant: function (soon) {
      clearTimeout(this.ftimer);
      this.ftimer = null;
      if (!this.on || !this.faraway || !this.faraway.length) return;
      var self = this;
      // The first one comes early enough that a visitor who stays two minutes
      // hears several, and one within the first half-minute.
      var wait = soon ? rand(9, 24) : rand(26, 74);
      this.ftimer = setTimeout(function () {
        var pool = self.faraway;
        if (pool && pool.length) self[pool[Math.floor(Math.random() * pool.length)]]();
        self.distant();
      }, wait * 1000);
    },

    /* A tawny owl, which is very nearly a pure sine — the reason owls are the
       one bird worth synthesising. The phrase is the giveaway, not the tone:
       one long note, then three or four seconds of nothing, then a short
       catch and a long wavering fall. That pause is what makes it an owl and
       not a flute, and it is also the loneliest three seconds available. */
    owl: function () {
      var t = this.ctx.currentTime + rand(0, 0.5);
      var f = rand(300, 460);
      var lv = rand(0.055, 0.105);
      var pan = rand(-0.8, 0.8);
      this.hoot(t, f, 0.55, false, lv, pan);
      var again = t + rand(3, 4.4);
      this.hoot(again, f * 0.985, 0.1, false, lv * 0.5, pan);
      this.hoot(again + 0.17, f * 1.012, rand(0.85, 1.3), true, lv, pan);
    },

    hoot: function (t, f, dur, wobble, level, pan) {
      var ctx = this.ctx;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(level, t + Math.min(0.1, dur * 0.3));
      g.gain.setValueAtTime(level, t + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f * 1.03, t);
      o.frequency.exponentialRampToValueAtTime(f, t + dur * 0.3);
      o.frequency.exponentialRampToValueAtTime(f * 0.95, t + dur);
      o.connect(g);

      // Just enough second harmonic to stop it being a test tone.
      var h = ctx.createOscillator();
      var hg = ctx.createGain();
      h.type = 'sine';
      h.frequency.value = f * 2;
      hg.gain.value = 0.055;
      h.connect(hg); hg.connect(g);

      // The tremolo arrives partway through the long note, never at its start.
      if (wobble) {
        var lfo = ctx.createOscillator();
        var d = ctx.createGain();
        lfo.frequency.value = rand(10.5, 13);
        d.gain.setValueAtTime(0, t);
        d.gain.linearRampToValueAtTime(f * 0.014, t + dur * 0.45);
        lfo.connect(d); d.connect(o.frequency);
        lfo.start(t); lfo.stop(t + dur + 0.2);
      }

      this.afar(g, pan);
      o.start(t); o.stop(t + dur + 0.2);
      h.start(t); h.stop(t + dur + 0.2);
    },

    /* A stone let go of on a mountainside: a handful of impacts, each quieter
       than the last, the intervals stretching as it loses its way down. You
       do not hear the stone. You hear the eleven seconds it takes the sound
       to come back, and that is the size of the place. */
    stone: function () {
      var t = this.ctx.currentTime;
      var n = 3 + Math.floor(Math.random() * 6);
      var pan = rand(-0.75, 0.75);
      var lv = rand(0.05, 0.115);
      var step = rand(0.11, 0.28);
      for (var i = 0; i < n; i++) {
        this.knock(t, rand(70, 190), lv * Math.pow(0.74, i) * rand(0.6, 1.25), pan);
        step *= rand(0.85, 1.6);
        t += step;
      }
    },

    knock: function (t, f, level, pan) {
      var ctx = this.ctx;
      var g = ctx.createGain();
      var len = rand(0.07, 0.2);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(level, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);

      var src = ctx.createBufferSource();
      src.buffer = this.beds[0].src.buffer;
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 2.2;
      src.connect(bp); bp.connect(g);

      // The impact is the noise; this is the mass behind it.
      var o = ctx.createOscillator();
      var og = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f * 0.8, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.1);
      og.gain.value = 0.55;
      o.connect(og); og.connect(g);

      this.afar(g, pan);
      src.start(t, Math.random() * (src.buffer.duration - 0.4)); src.stop(t + len + 0.2);
      o.start(t); o.stop(t + len + 0.2);
    },

    /* The vacuum. Twenty seconds of almost nothing at forty hertz, rising out
       of the floor and going back into it. On a laptop speaker it is very
       nearly inaudible — it is meant to be. You do not hear this one, you
       notice the room got bigger and then stopped being bigger. */
    abyss: function () {
      if (this.swelling) return;                 // never two at once
      var ctx = this.ctx, t = ctx.currentTime, self = this;
      var up = rand(6, 11), down = rand(8, 15);
      this.swelling = true;
      setTimeout(function () { self.swelling = false; }, (up + down) * 1000);

      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0.7;
      lp.frequency.setValueAtTime(70, t);
      lp.frequency.linearRampToValueAtTime(230, t + up);
      lp.frequency.linearRampToValueAtTime(70, t + up + down);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(rand(0.10, 0.19), t + up);
      g.gain.exponentialRampToValueAtTime(0.0001, t + up + down);
      lp.connect(g);
      this.afar(g, rand(-0.3, 0.3));             // near the centre: it is everywhere

      var f = rand(36, 56);
      [[1, 1], [1.5, 0.35], [2.004, 0.3]].forEach(function (r, i) {
        var o = ctx.createOscillator();
        var og = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f * r[0];
        o.detune.value = (i - 1) * 5;
        og.gain.value = r[1];
        o.connect(og); og.connect(lp);
        o.start(t); o.stop(t + up + down + 0.5);
      });
    },

    /* Wind finding an edge a long way off. A thin sine that takes three
       seconds to arrive, drifts a few cents while it is there, and goes.
       Nearly a voice, which is why it is the one that unsettles people. */
    keen: function () {
      var ctx = this.ctx, t = ctx.currentTime;
      var f = rand(820, 1700);
      var att = rand(2.2, 4), hold = rand(2, 5), rel = rand(3.5, 7);
      var end = t + att + hold + rel;

      var g = ctx.createGain();
      var level = rand(0.012, 0.028);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(level, t + att);
      g.gain.linearRampToValueAtTime(level * 0.85, t + att + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, end);

      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t);
      o.frequency.linearRampToValueAtTime(f * rand(0.94, 1.06), end);
      o.connect(g);

      this.afar(g);
      o.start(t); o.stop(end + 0.3);
    },

    /* ----------------------------------------------------------- the drift */

    /**
     * Every minute or so the pad moves to a neighbouring chord, over twenty
     * seconds, above a drone that never moves.
     *
     * This is the difference between atmosphere and music. A chord held for
     * as long as somebody looks at a gallery stops being heard after ninety
     * seconds — the ear files it as the shape of the room and lets it go.
     * Moving it that slowly means nobody ever catches it changing, and it
     * never stops being listened to.
     */
    drift: function () {
      clearTimeout(this.ptimer);
      this.ptimer = null;
      if (!this.on) return;
      var self = this;
      this.ptimer = setTimeout(function () {
        if (!self.on) return;
        var pad = spec(current).sound.pad;
        // All of these are consonant over a fixed pedal in a minor context.
        // The +2 is the one that hurts, so it is in there twice.
        var steps = [-5, -3, -2, 0, 2, 2, 3, 5];
        var step = steps[Math.floor(Math.random() * steps.length)];
        self.chord(self.pads, {
          root: pad.root * Math.pow(2, step / 12),
          stack: pad.stack, g: pad.g, cut: pad.cut
        }, 24);
        self.drift();
      }, rand(45, 88) * 1000);
    },

    /** Noise shaped like a note — the breath in a flute, the nail on a string. */
    air: function (t, end, centre, q, level, att) {
      var ctx = this.ctx;
      var src = ctx.createBufferSource();
      src.buffer = this.beds[0].src.buffer;
      // A random offset into the loop, or every breath on the page is the
      // same four seconds of noise and the ear finds it.
      src.loop = true;
      src.loopStart = 0;
      src.loopEnd = src.buffer.duration;

      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = Math.min(16000, centre);
      bp.Q.value = q;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(level, t + att);
      g.gain.exponentialRampToValueAtTime(0.0001, end);

      src.connect(bp); bp.connect(g); g.connect(this.bus);
      src.start(t, Math.random() * (src.buffer.duration - 0.5));
      src.stop(end + 0.1);
    },

    /* ---------------------------------------------------------- on / off */

    start: function () {
      if (!this.ready && !this.build()) return false;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      clearTimeout(this.sleep);
      this.on = true;
      this.tune(current, 0.1);
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      // Four and a half seconds to arrive. Anything quicker is a thing being
      // switched on, and the room should only ever seem to have been like this
      // since before you got here.
      this.master.gain.linearRampToValueAtTime(0.55, this.ctx.currentTime + 4.5);
      this.schedule(true);
      this.drips(true);
      this.distant(true);
      this.drift();
      return true;
    },

    /** Is anything actually coming out? Not the same question as `on`. */
    live: function () {
      return this.ready && this.on && this.ctx.state === 'running';
    },

    stop: function (hard) {
      if (!this.ready) return;
      this.on = false;
      clearTimeout(this.timer); this.timer = null;
      clearTimeout(this.dtimer); this.dtimer = null;
      clearTimeout(this.ftimer); this.ftimer = null;
      clearTimeout(this.ptimer); this.ptimer = null;
      var ctx = this.ctx;
      this.master.gain.cancelScheduledValues(ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0, ctx.currentTime + (hard ? 0.6 : 1.6));
      // Suspended once it is actually silent, not before — a suspend mid-ramp
      // freezes the tail and it is still there when the tab comes back.
      var self = this;
      clearTimeout(this.sleep);
      this.sleep = setTimeout(function () {
        if (!self.on && self.ctx.state === 'running') self.ctx.suspend();
      }, (hard ? 0.7 : 1.7) * 1000);
    }
  };

  /* ==================================================================
     The controls.
     ================================================================== */

  var pinned = null;          // a weather the visitor chose, or null for "whatever comes"
  try { pinned = localStorage.getItem(PICK_KEY); } catch (e) {}
  if (pinned !== 'none' && !WEATHER[pinned]) pinned = null;

  var ui = {};

  function label(key) {
    ui.label.textContent = spec(key).name;
    ui.dot.style.background = spec(key).dot;
    ui.dot.style.boxShadow = '0 0 10px -1px ' + spec(key).dot;
    ui.button.setAttribute('title', 'The weather: ' + spec(key).name);
  }

  function mark() {
    var chosen = pinned === null ? 'auto' : pinned;
    [].forEach.call(ui.menu.children, function (row) {
      var is = row.getAttribute('data-w') === chosen;
      row.setAttribute('aria-checked', is ? 'true' : 'false');
      row.classList.toggle('is-chosen', is);
    });
  }

  /**
   * Weather does not cut. Both canvases and the colour cast are taken down
   * first, the palette is swapped while there is nothing on screen to see it
   * step, and the new sky is brought up underneath.
   */
  function change(key, remember) {
    if (remember !== false) {
      pinned = key === 'auto' ? null : key;
      try {
        if (pinned === null) localStorage.removeItem(PICK_KEY);
        else localStorage.setItem(PICK_KEY, pinned);
      } catch (e) {}
      mark();
    }
    if (key === 'auto') { label(current); return; }
    // Choosing the weather you are already in is how you ask for a different
    // instrument over it. It is the only re-roll that does not need a control
    // of its own, and the line under the buttons names what arrived, so it is
    // findable by anyone who wonders what that word was.
    if (key === current) {
      if (Sound.on) { Sound.pick(); Sound.schedule(true); }
      return;
    }

    current = key;
    label(key);
    root.classList.add('is-turning');
    Sound.tune(key, 3);

    setTimeout(function () {
      root.setAttribute('data-weather', key);
      if (Sky.running) Sky.populate(key);
      root.classList.remove('is-turning');
    }, 1250);
  }

  function menu(open) {
    ui.menu.hidden = !open;
    ui.pick.classList.toggle('is-open', open);
    ui.button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function controls() {
    ui.pick = document.getElementById('weatherPick');
    ui.button = document.getElementById('weatherButton');
    ui.menu = document.getElementById('weatherMenu');
    ui.label = document.getElementById('weatherLabel');
    ui.dot = document.getElementById('weatherDot');
    ui.sound = document.getElementById('soundToggle');
    ui.sounding = document.getElementById('sounding');
    if (!ui.pick || !ui.sound) return;

    // The menu is built here rather than in the template so that it can only
    // exist where it works — a list of weathers with no script behind it is a
    // control that lies.
    ['auto'].concat(ORDER, ['none']).forEach(function (key) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'weather-pick__row';
      row.setAttribute('role', 'menuitemradio');
      row.setAttribute('data-w', key);
      row.textContent = key === 'auto' ? 'whatever comes' : spec(key).name;
      if (key === 'auto') row.classList.add('weather-pick__row--auto');
      if (key === 'none') row.classList.add('weather-pick__row--none');
      row.addEventListener('click', function () {
        change(key);
        menu(false);
        ui.button.focus();
      });
      ui.menu.appendChild(row);
    });

    label(current);
    mark();

    ui.button.addEventListener('click', function (ev) {
      ev.stopPropagation();
      menu(ui.menu.hidden);
    });
    document.addEventListener('click', function (ev) {
      if (!ui.menu.hidden && !ui.pick.contains(ev.target)) menu(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !ui.menu.hidden) { menu(false); ui.button.focus(); }
    });

    /* ------------------------------------------------------------ sound */

    function audible(yes) {
      ui.sound.setAttribute('aria-pressed', yes ? 'true' : 'false');
      ui.sound.classList.toggle('is-playing', yes);
      ui.sound.querySelector('.sound-toggle__label').textContent = yes ? 'silence' : 'listen';
      ui.sound.setAttribute('title', yes
        ? 'Stop the sound'
        : 'Hear the weather — a different instrument over it each time');
      if (!yes && ui.sounding) ui.sounding.classList.remove('is-on');
    }

    /* The instrument is drawn from a handful that suit the weather, so it is
       different on every visit. Named for a few seconds when it arrives —
       long enough to be read, short enough not to become furniture. */
    var told;
    Sound.onvoice = function (v) {
      if (!Sound.on || !ui.sounding) return;
      ui.sounding.textContent = v.name + ' · ' + v.from;
      ui.sounding.classList.add('is-on');
      clearTimeout(told);
      told = setTimeout(function () { ui.sounding.classList.remove('is-on'); }, 7000);
    };

    ui.sound.addEventListener('click', function () {
      var playing = ui.sound.getAttribute('aria-pressed') === 'true';
      if (playing) { Sound.stop(); audible(false); }
      else if (Sound.start()) { audible(true); }
      try { localStorage.setItem(SOUND_KEY, playing ? '0' : '1'); } catch (e) {}
    });

    /* Sound is on unless the visitor has turned it off.

       It cannot literally begin on load — no browser will start an
       AudioContext without a gesture, and none should — so it waits for the
       first thing the visitor touches. On this site that is the tap that
       lifts the veil, which means in practice the room has weather in it
       from the moment the gallery opens.

       Only events that actually grant user activation are listened for.
       Scrolling does not count, and standing the listener down on a wheel
       event would spend the one chance to start on an event that cannot. */
    var GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'];
    var wanted = true;
    try {
      var saved = localStorage.getItem(SOUND_KEY);
      if (saved !== null) wanted = saved === '1';
    } catch (e) {}

    if (wanted) {
      var wake = function () {
        if (!Sound.start()) return;
        audible(true);
        GESTURES.forEach(function (evt) { window.removeEventListener(evt, wake); });
        // resume() is a promise, so the context may still be suspended for a
        // moment. If it never comes up, put the button back rather than leave
        // it claiming to be playing.
        setTimeout(function () {
          if (Sound.on && !Sound.live()) {
            audible(false);
            GESTURES.forEach(function (evt) {
              window.addEventListener(evt, wake, { passive: true });
            });
          }
        }, 900);
      };
      GESTURES.forEach(function (evt) {
        window.addEventListener(evt, wake, { passive: true });
      });
    }

    root.classList.add('weather-ready');
  }

  /* ==================================================================
     Go.
     ================================================================== */

  function init() {
    controls();
    Sky.init();

    // Nothing should be playing to an empty room.
    document.addEventListener('visibilitychange', function () {
      if (!Sound.ready) return;
      if (document.hidden) {
        if (Sound.on) { Sound.wasOn = true; Sound.stop(true); }
      } else if (Sound.wasOn) {
        Sound.wasOn = false;
        Sound.start();
      }
    });

    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (!Sky.running) return;
        Sky.measure();
        Sky.populate(current);
      }, 200);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
