/* pixelworker.js — per-pixel image operations, off the main thread.
 *
 * WHY THIS EXISTS
 *
 * A convolution over a 12-megapixel photo is roughly 180 million arithmetic
 * operations. Run on the main thread that freezes the tab for seconds: the page
 * will not scroll, the button will not respond, and — the part that matters
 * here — THE PROGRESS BAR CANNOT REPAINT. Calling api.progress() from inside a
 * synchronous loop does nothing at all, because the browser has no opportunity
 * to paint until the loop ends. The old sharpen tool reported progress every 64
 * rows and every one of those calls was thrown away.
 *
 * So the work moves to a Worker. The page stays responsive, the bar paints, and
 * progress messages arrive between row bands.
 *
 * The operations themselves are PURE FUNCTIONS defined once below, exported for
 * unit tests, and serialised into the worker via toString(). One source of
 * truth: the code under test is literally the code that runs.
 */
(function (root) {
  'use strict';

  /* ---------- operations (pure, unit-tested, also serialised into the worker) ----------
     Each takes (src, dst, w, h, params, rowFrom, rowTo) and fills dst rows
     [rowFrom, rowTo). Splitting by row band is what makes progress reporting
     possible without re-entering the function. */

  function opSharpen(s, d, w, h, p, rowFrom, rowTo) {
    /* 3x3 unsharp kernel: centre 1+4a, four neighbours -a, where `a` is
       strength. Edge pixels simply OMIT the missing taps rather than clamping
       to the edge value, and the centre weight is deliberately not
       renormalised there — at these strengths the resulting edge darkening is
       invisible.

       DO NOT HAND-OPTIMISE THIS. It was tried: interior pixels split from the
       border so the twelve per-pixel bounds checks could be dropped, and the
       four neighbour taps summed before a single multiply. In Node that was
       1.66x faster (106ms -> 64ms on 1.9 MP). In Chrome — where it actually
       runs — it was consistently SLOWER, median 361ms against 294ms across
       alternating runs, with every optimised run losing to every plain one.
       V8 handles the straightforward loop better than the clever version, and
       the clever version added a border special-case that could only ever be a
       correctness risk. Measure in a browser before touching this.

       The fix for responsiveness was moving off the main thread, not this. */
    var a = p.amount / 5, center = 1 + 4 * a, side = -a;
    var rowBytes = w * 4;
    for (var y = rowFrom; y < rowTo; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        for (var c = 0; c < 3; c++) {
          var v = center * s[i + c];
          if (x > 0) v += side * s[i - 4 + c];
          if (x < w - 1) v += side * s[i + 4 + c];
          if (y > 0) v += side * s[i - rowBytes + c];
          if (y < h - 1) v += side * s[i + rowBytes + c];
          d[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
        d[i + 3] = s[i + 3];        // alpha is never sharpened
      }
    }
  }

  function opTone(s, d, w, h, p, rowFrom, rowTo) {
    /* Luminance coefficients are Rec. 601 — the weights the eye actually uses,
       not a flat average, which is why a naive (r+g+b)/3 greyscale looks muddy. */
    var sepia = p.mode === 'sepia';
    for (var i = rowFrom * w * 4, end = rowTo * w * 4; i < end; i += 4) {
      var y = 0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2];
      if (sepia) {
        d[i] = y + 40 > 255 ? 255 : y + 40;
        d[i + 1] = y + 20 > 255 ? 255 : y + 20;
        d[i + 2] = y - 20 < 0 ? 0 : y - 20;
      } else {
        d[i] = d[i + 1] = d[i + 2] = y;
      }
      d[i + 3] = s[i + 3];
    }
  }

  var OPS = { sharpen: opSharpen, tone: opTone };

  /* Rows per progress report. Small enough that the bar moves on a big image,
     large enough that postMessage overhead stays irrelevant. */
  var BAND = 64;

  /* Shared driver: runs an op over the whole image in bands, reporting after
     each. Used verbatim on both sides — inside the worker, and on the main
     thread when there is no worker to use. */
  function runBands(op, s, d, w, h, params, report) {
    for (var y = 0; y < h; y += BAND) {
      var to = y + BAND > h ? h : y + BAND;
      op(s, d, w, h, params, y, to);
      if (report) report(to / h);
    }
  }

  /* ---------- worker source ----------
   *
   * Built from the same function objects that the tests exercise, so there is
   * no second copy to drift out of sync.
   *
   * EVERY OP MUST BE SELF-CONTAINED, or listed in `HELPERS`. toString() captures
   * a function's own text and nothing it closes over, so an op that calls a
   * helper which was not shipped throws ReferenceError inside the worker —
   * where the failure is invisible until a user clicks the button. The test
   * suite executes the generated source to catch exactly that.
   * HELPERS is empty today because both ops stand alone; it exists so the next
   * one that needs a helper has somewhere obvious to declare it. */
  var HELPERS = {};

  function workerSource() {
    var decls = [];
    for (var hk in HELPERS) if (Object.prototype.hasOwnProperty.call(HELPERS, hk)) {
      decls.push('var ' + hk + ' = ' + HELPERS[hk].toString() + ';');
    }
    var ops = [];
    for (var k in OPS) if (Object.prototype.hasOwnProperty.call(OPS, k)) {
      ops.push(JSON.stringify(k) + ':' + OPS[k].toString());
    }
    return '(function () {\n' +
      '"use strict";\n' +
      'var BAND = ' + BAND + ';\n' +
      decls.join('\n') + '\n' +
      'var OPS = {' + ops.join(',') + '};\n' +
      'var runBands = ' + runBands.toString() + ';\n' +
      'self.onmessage = ' + workerOnMessage.toString() + ';\n' +
      '})()';
  }

  /* Defined at module scope so it is a real, lintable function rather than a
     string literal — it runs only inside the worker. */
  function workerOnMessage(e) {
    var m = e.data;
    var src = new Uint8ClampedArray(m.buf);
    var dst = new Uint8ClampedArray(src.length);
    var op = OPS[m.op];
    if (!op) { self.postMessage({ error: 'Unknown operation: ' + m.op }); return; }
    var last = -1;
    runBands(op, src, dst, m.w, m.h, m.params, function (f) {
      /* Only post when the rounded percentage actually changes — a tall image
         has hundreds of bands and each message costs a structured clone on the
         receiving side. */
      var pct = Math.round(f * 100);
      if (pct !== last) { last = pct; self.postMessage({ progress: f }); }
    });
    self.postMessage({ done: true, buf: dst.buffer }, [dst.buffer]);
  }

  var _url = null;
  function workerURL() {
    if (!_url) _url = URL.createObjectURL(new Blob([workerSource()], { type: 'text/javascript' }));
    return _url;
  }

  function canUseWorker() {
    return typeof Worker === 'function' && typeof Blob === 'function' && typeof URL !== 'undefined' && !!URL.createObjectURL;
  }

  /* Anything above this many pixels is worth the ~20ms of worker startup.
     Below it, spinning up a worker and copying the buffer twice is slower than
     just doing the work. */
  var WORKER_MIN_PIXELS = 250000;   // ~0.25 MP, i.e. smaller than 600x420

  /* Run `opName` over an ImageData. Resolves with a NEW ImageData.
     onProgress(0..1) fires as bands complete — and unlike the old in-loop
     calls, these actually reach the screen. */
  function run(opName, imageData, params, onProgress) {
    var w = imageData.width, h = imageData.height;
    var report = onProgress || function () {};

    if (!OPS[opName]) return Promise.reject(new Error('Unknown operation: ' + opName));

    if (!canUseWorker() || w * h < WORKER_MIN_PIXELS) {
      return runOnMainThread(opName, imageData, params, report);
    }

    return new Promise(function (res, rej) {
      var wk;
      try { wk = new Worker(workerURL()); }
      catch (e) { res(runOnMainThread(opName, imageData, params, report)); return; }

      var settled = false;
      function finish(fn, arg) {
        if (settled) return;
        settled = true;
        try { wk.terminate(); } catch (e) {}
        fn(arg);
      }
      wk.onmessage = function (e) {
        var m = e.data;
        if (m.error) { finish(rej, new Error(m.error)); return; }
        if (m.progress != null) { report(m.progress); return; }
        if (m.done) {
          var out = new ImageData(new Uint8ClampedArray(m.buf), w, h);
          finish(res, out);
        }
      };
      /* A worker that dies mid-job must not hang the tool — fall back rather
         than leaving the caller waiting on a promise that will never settle. */
      wk.onerror = function () {
        if (settled) return;
        settled = true;
        try { wk.terminate(); } catch (e) {}
        runOnMainThread(opName, imageData, params, report).then(res, rej);
      };

      /* Copy the source: transferring the caller's buffer would detach the
         ImageData they still hold a reference to. */
      var copy = new Uint8ClampedArray(imageData.data);
      wk.postMessage({ op: opName, buf: copy.buffer, w: w, h: h, params: params || {} }, [copy.buffer]);
    });
  }

  /* Fallback path. Still yields between bands so the bar can paint — slower
     than the worker overall, but never freezes the tab for seconds at a time. */
  function runOnMainThread(opName, imageData, params, report) {
    var w = imageData.width, h = imageData.height;
    var s = imageData.data;
    var d = new Uint8ClampedArray(s.length);
    var op = OPS[opName];
    var y = 0;
    return new Promise(function (res) {
      function chunk() {
        var to = y + BAND > h ? h : y + BAND;
        op(s, d, w, h, params || {}, y, to);
        y = to;
        report(y / h);
        if (y < h) setTimeout(chunk, 0);          // let the browser paint
        else res(new ImageData(d, w, h));
      }
      chunk();
    });
  }

  root.VKPixels = {
    run: run,
    ops: OPS,
    runBands: runBands,
    canUseWorker: canUseWorker,
    BAND: BAND,
    WORKER_MIN_PIXELS: WORKER_MIN_PIXELS,
    workerSource: workerSource,
    helpers: HELPERS
  };
  if (typeof module === 'object' && module.exports) module.exports = root.VKPixels;
})(typeof window !== 'undefined' ? window : globalThis);
