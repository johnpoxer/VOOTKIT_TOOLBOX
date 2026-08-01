/* pixels.test.js — per-pixel operations and the worker that runs them.
 *
 * The operations are the part that must be provably correct: they are
 * serialised into a Worker via toString(), so a bug here ships to a context
 * that is much harder to debug. The driver around them is tested for the
 * properties that actually caused user-visible problems — chiefly that
 * progress is reported at all, since the whole reason this file exists is that
 * api.progress() inside a synchronous loop never reaches the screen. */
"use strict";
const assert = require("assert");
global.window = global;
const P = require("../assets/js/pixelworker.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); pass++; };

/* Build an RGBA buffer w*h with a callback. */
function make(w, h, fn) {
  const a = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, px = fn(x, y);
    a[i] = px[0]; a[i + 1] = px[1]; a[i + 2] = px[2]; a[i + 3] = px.length > 3 ? px[3] : 255;
  }
  return a;
}
const at = (a, w, x, y) => [a[(y * w + x) * 4], a[(y * w + x) * 4 + 1], a[(y * w + x) * 4 + 2], a[(y * w + x) * 4 + 3]];

/* --- tone: greyscale and sepia --- */
{
  const w = 4, h = 4;
  const s = make(w, h, () => [200, 100, 50, 255]);
  const d = new Uint8ClampedArray(s.length);
  P.ops.tone(s, d, w, h, { mode: "gray" }, 0, h);
  // Rec.601: 0.299*200 + 0.587*100 + 0.114*50 = 59.8 + 58.7 + 5.7 = 124.2
  const g = at(d, w, 1, 1);
  eq(g[0], 124, "greyscale uses Rec.601 luminance, not a flat average");
  ok(g[0] === g[1] && g[1] === g[2], "greyscale leaves the three channels equal");
  eq(g[3], 255, "alpha survives greyscale");

  /* A flat average would give (200+100+50)/3 = 116. The distinction matters:
     it is why a naive greyscale looks muddy on skin tones. */
  ok(g[0] !== 116, "not a flat channel average");

  const d2 = new Uint8ClampedArray(s.length);
  P.ops.tone(s, d2, w, h, { mode: "sepia" }, 0, h);
  const sp = at(d2, w, 1, 1);
  ok(sp[0] > sp[1] && sp[1] > sp[2], "sepia warms red over green over blue");

  /* Clamping, in both directions. */
  const bright = make(2, 2, () => [255, 255, 255]);
  const bd = new Uint8ClampedArray(bright.length);
  P.ops.tone(bright, bd, 2, 2, { mode: "sepia" }, 0, 2);
  eq(at(bd, 2, 0, 0)[0], 255, "sepia red cannot exceed 255");
  const dark = make(2, 2, () => [0, 0, 0]);
  const dd = new Uint8ClampedArray(dark.length);
  P.ops.tone(dark, dd, 2, 2, { mode: "sepia" }, 0, 2);
  eq(at(dd, 2, 0, 0)[2], 0, "sepia blue cannot go below 0");

  /* Transparency must be carried through untouched — a greyscale that
     flattened alpha would silently ruin every logo run through it. */
  const trans = make(2, 2, () => [10, 20, 30, 0]);
  const td = new Uint8ClampedArray(trans.length);
  P.ops.tone(trans, td, 2, 2, { mode: "gray" }, 0, 2);
  eq(at(td, 2, 0, 0)[3], 0, "fully transparent pixels stay transparent");
}

/* --- sharpen: the convolution --- */
{
  const w = 5, h = 5;
  // a single bright pixel in the centre of a dark field
  const s = make(w, h, (x, y) => (x === 2 && y === 2) ? [200, 200, 200] : [100, 100, 100]);
  const d = new Uint8ClampedArray(s.length);
  P.ops.sharpen(s, d, w, h, { amount: 5 }, 0, h);   // amount 5 -> a = 1

  const centre = at(d, w, 2, 2)[0];
  const neighbour = at(d, w, 2, 1)[0];
  ok(centre > 200, "sharpening pushes the bright centre brighter, got " + centre);
  ok(neighbour < 100, "and pulls its neighbours darker, got " + neighbour);

  /* a = 1 => centre weight 5, sides -1. centre: 5*200 - 4*100 = 600 -> clamps
     to 255. neighbour: 5*100 - 100 - 100 - 100 - 200 = 0. */
  eq(centre, 255, "over-bright results clamp at 255 rather than wrapping");
  eq(neighbour, 0, "under-dark results clamp at 0 rather than going negative");

  /* Amount 0 must be a true identity — the slider's floor should not alter
     the image at all. */
  const flat = make(w, h, (x, y) => [x * 20, y * 20, 128]);
  const id = new Uint8ClampedArray(flat.length);
  P.ops.sharpen(flat, id, w, h, { amount: 0 }, 0, h);
  let same = true;
  for (let i = 0; i < flat.length; i++) if (flat[i] !== id[i]) same = false;
  ok(same, "amount 0 leaves every pixel untouched");

  /* Alpha is never sharpened: haloing the alpha channel produces visible
     fringing on anything with a transparent background. */
  const withA = make(3, 3, (x, y) => [100, 100, 100, x === 1 && y === 1 ? 255 : 0]);
  const ad = new Uint8ClampedArray(withA.length);
  P.ops.sharpen(withA, ad, 3, 3, { amount: 5 }, 0, 3);
  eq(at(ad, 3, 1, 1)[3], 255, "alpha passes through untouched");
  eq(at(ad, 3, 0, 0)[3], 0, "transparent alpha passes through untouched");
}

/* --- band splitting must be seamless ---
   The image is processed in horizontal bands so progress can be reported
   between them. If a band boundary changed the result, the output would carry
   visible horizontal seams every 64 rows. */
{
  const w = 8, h = 8;
  const s = make(w, h, (x, y) => [(x * 31) % 256, (y * 17) % 256, ((x + y) * 7) % 256]);
  const whole = new Uint8ClampedArray(s.length);
  P.ops.sharpen(s, whole, w, h, { amount: 4 }, 0, h);

  const banded = new Uint8ClampedArray(s.length);
  for (let y = 0; y < h; y += 3) P.ops.sharpen(s, banded, w, h, { amount: 4 }, y, Math.min(y + 3, h));

  let identical = true;
  for (let i = 0; i < whole.length; i++) if (whole[i] !== banded[i]) identical = false;
  ok(identical, "processing in bands gives byte-identical output — no seams");
}

/* --- runBands: coverage and progress --- */
{
  const w = 4, h = 200;
  const s = make(w, h, () => [10, 20, 30]);
  const d = new Uint8ClampedArray(s.length);
  const seen = [];
  P.runBands(P.ops.tone, s, d, w, h, { mode: "gray" }, f => seen.push(f));

  ok(seen.length > 1, "a tall image reports progress more than once");
  eq(seen[seen.length - 1], 1, "the last report is exactly 1, so the bar reaches 100%");
  let rising = true;
  for (let i = 1; i < seen.length; i++) if (seen[i] <= seen[i - 1]) rising = false;
  ok(rising, "progress only ever increases");
  ok(seen.every(f => f > 0 && f <= 1), "every reported fraction is in range");

  /* Every row must be written. An off-by-one in the band loop would leave the
     final partial band as untouched black pixels along the bottom edge. */
  let allWritten = true;
  for (let y = 0; y < h; y++) if (at(d, w, 0, y)[3] !== 255) allWritten = false;
  ok(allWritten, "every row is covered, including the final partial band");

  /* A short image still completes. */
  const shortSeen = [];
  const s2 = make(2, 1, () => [1, 2, 3]), d2 = new Uint8ClampedArray(8);
  P.runBands(P.ops.tone, s2, d2, 2, 1, { mode: "gray" }, f => shortSeen.push(f));
  eq(shortSeen, [1], "an image shorter than one band reports once, at 1");
}

/* --- the worker source must actually be valid JavaScript ---
   It is assembled by string concatenation from toString(), so a syntax error
   would only surface at runtime inside a Worker, where nobody would see it. */
{
  const src = P.workerSource();
  ok(src.length > 200, "worker source is non-trivial");
  ok(/self\.onmessage/.test(src), "the worker installs a message handler");
  ok(/postMessage\(\{ done: true/.test(src), "the worker reports completion");
  ok(/\[dst\.buffer\]/.test(src), "the result buffer is transferred, not copied");
  assert.doesNotThrow(() => new Function('"use strict"; return ' + src.replace(/^\(/, "(")),
    "worker source parses as JavaScript");
  pass++;
  ["sharpen", "tone"].forEach(op => ok(src.includes(op), "op '" + op + "' is serialised into the worker"));
}

/* --- guard rails --- */
{
  ok(P.WORKER_MIN_PIXELS > 0, "there is a floor below which a worker is not worth starting");
  ok(P.BAND > 0 && Number.isInteger(P.BAND), "band height is a positive integer");
  /* An unknown op must reject, not throw synchronously — the tool's own
     try/catch only handles rejections. */
  assert.doesNotThrow(() => {
    P.run("nope", { width: 1, height: 1, data: new Uint8ClampedArray(4) }, {}, () => {}).catch(() => {});
  }, "an unknown operation returns a rejected promise rather than throwing");
  pass++;
  eq(Object.keys(P.ops).sort(), ["sharpen", "tone"], "exactly the operations we document");
}

/* --- the tools must actually use it, and the pages must ship it --- */
{
  const fs = require("fs"), path = require("path");
  const img = fs.readFileSync(path.join(__dirname, "../assets/js/tools-image.js"), "utf8");
  const img2 = fs.readFileSync(path.join(__dirname, "../assets/js/tools-image2.js"), "utf8");
  const build = fs.readFileSync(path.join(__dirname, "../build.js"), "utf8");

  ok(/VKPixels\.run\('tone'/.test(img), "grayscale-image goes through the worker");
  ok(/VKPixels\.run\('sharpen'/.test(img2), "image-sharpen goes through the worker");

  /* The old inline convolution must be gone, not merely bypassed. */
  ok(!/if \(y % 64 === 0\) api\.progress/.test(img2),
     "the in-loop progress calls that could never repaint are removed");
  ok(!/center \* s\[i \+ c\]/.test(img2), "the inline convolution is gone from the tool");

  /* A page that calls VKPixels but does not load pixelworker.js is a broken
     tool, and it would only fail at click time. */
  const declared = build.match(/const PIXEL_TOOLS = \{([^}]*)\}/)[1];
  ["image-sharpen", "grayscale-image"].forEach(id =>
    ok(declared.includes(id), id + " is declared so its page ships pixelworker.js"));
  const users = [...img.matchAll(/'([a-z0-9-]+)':\s*\{[\s\S]{0,4000}?VKPixels\.run/g)].length
              + [...img2.matchAll(/'([a-z0-9-]+)':\s*\{[\s\S]{0,4000}?VKPixels\.run/g)].length;
  ok(users <= declared.split(",").filter(s => s.trim()).length,
     "every tool using VKPixels is declared in PIXEL_TOOLS");
}

/* --- image decoding moved off the main thread, without breaking EXIF --- */
{
  const ft = require("fs").readFileSync(require("path").join(__dirname, "../assets/js/filetool.js"), "utf8");
  ok(/createImageBitmap\(file, \{ imageOrientation: 'from-image' \}\)/.test(ft),
     "decoding asks for EXIF orientation — without it every sideways phone photo would rotate");
  ok(/return loadImageElement\(file, urls\); \}\)/.test(ft) || /\.catch\(function \(\) \{ return loadImageElement/.test(ft),
     "a failed bitmap decode falls back to an <img>, which SVG still needs");
  ok(/naturalWidth', \{ value: bmp\.width/.test(ft),
     "the bitmap exposes naturalWidth so it is a drop-in for the <img> callers");
  ok(/file instanceof Blob/.test(ft), "only real Blobs take the fast path");
}


/* ---------------------------------------------------------------------------
 * THE FAST PATH MUST BE BYTE-IDENTICAL TO THE REFERENCE
 *
 * The kernel is currently written the plain way, after a hand-optimised version
 * measured SLOWER in Chrome (median 361ms vs 294ms on 1.9 MP) despite being
 * 1.66x faster in Node. These assertions stay so that the next person to try
 * optimising it has a ready-made correctness harness: an off-by-one at a border
 * shows as a bright or dark one-pixel frame around every sharpened image, which
 * is easy to miss by eye and impossible to miss here.
 * ------------------------------------------------------------------------- */
function referenceSharpen(s, w, h, amount) {
  const d = new Uint8ClampedArray(s.length);
  const a = amount / 5, center = 1 + 4 * a, side = -a;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) {
      let v = center * s[i + c];
      if (x > 0) v += side * s[i - 4 + c];
      if (x < w - 1) v += side * s[i + 4 + c];
      if (y > 0) v += side * s[i - w * 4 + c];
      if (y < h - 1) v += side * s[i + w * 4 + c];
      d[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
    d[i + 3] = s[i + 3];
  }
  return d;
}

/* Sizes chosen to hit every branch: 1-wide and 2-wide images have no interior
   column at all, 1-tall has no interior row, and the non-square cases catch
   row-stride mistakes that square images hide. */
[[1, 1], [1, 5], [2, 2], [3, 3], [2, 7], [7, 2], [5, 4], [4, 5], [9, 6], [16, 3], [3, 16], [33, 17]]
  .forEach(([w, h]) => {
    [0, 1, 4, 5, 10].forEach(amount => {
      const s = make(w, h, (x, y) => [(x * 37 + y * 11) % 256, (x * 5 + y * 91) % 256, (x * 143 + y * 61) % 256, (x + y) % 2 ? 255 : 128]);
      const fast = new Uint8ClampedArray(s.length);
      P.ops.sharpen(s, fast, w, h, { amount }, 0, h);
      const ref = referenceSharpen(s, w, h, amount);
      let diff = -1;
      for (let i = 0; i < ref.length; i++) if (ref[i] !== fast[i]) { diff = i; break; }
      ok(diff === -1, `fast path matches the reference at ${w}x${h} amount ${amount}` +
        (diff >= 0 ? ` (first difference at byte ${diff}: ${fast[diff]} vs ${ref[diff]})` : ""));
    });
  });

/* Banded and whole-image must still agree now that the border is special-cased
   — a band boundary is an interior row, so it must NOT take the edge path. */
{
  const w = 12, h = 40;
  const s = make(w, h, (x, y) => [(x * 21) % 256, (y * 33) % 256, ((x * y) % 256)]);
  const whole = new Uint8ClampedArray(s.length);
  P.ops.sharpen(s, whole, w, h, { amount: 7 }, 0, h);
  [1, 5, 7, 64].forEach(band => {
    const banded = new Uint8ClampedArray(s.length);
    for (let y = 0; y < h; y += band) P.ops.sharpen(s, banded, w, h, { amount: 7 }, y, Math.min(y + band, h));
    let same = true;
    for (let i = 0; i < whole.length; i++) if (whole[i] !== banded[i]) same = false;
    ok(same, `band size ${band} gives identical output to processing the whole image`);
  });
}

/* --- the worker must not reference anything it was not given ---
   toString() captures a function's own text and nothing it closes over, so an
   op calling a helper that was left out of HELPERS throws ReferenceError inside
   the worker, where nobody sees it until a user clicks the button. */
{
  const src = P.workerSource();
  Object.keys(P.helpers).forEach(name =>
    ok(new RegExp("var " + name + " = ").test(src), "helper '" + name + "' is declared in the worker"));
  ok(/var BAND = \d+;/.test(src), "BAND is a literal in the worker, not a closure reference");
  ok(/var runBands = /.test(src), "runBands is declared in the worker");
  ok(/var OPS = \{/.test(src), "OPS is declared in the worker");

  /* Actually execute the generated source against a fake `self` and run a real
     job through it. This is the only check that proves the bundle works. */
  const posted = [];
  const fakeSelf = { postMessage: (m) => posted.push(m) };
  new Function("self", src)(fakeSelf);
  ok(typeof fakeSelf.onmessage === "function", "the generated worker installs its handler");

  const w = 20, h = 20;
  const s = make(w, h, (x, y) => [(x * 13) % 256, (y * 29) % 256, 90]);
  const copy = new Uint8ClampedArray(s);
  fakeSelf.onmessage({ data: { op: "sharpen", buf: copy.buffer, w, h, params: { amount: 6 } } });
  const done = posted.find(m => m.done);
  ok(done, "the generated worker completes the job");
  ok(posted.some(m => m.progress != null), "the generated worker reports progress");

  const got = new Uint8ClampedArray(done.buf);
  const expect = referenceSharpen(s, w, h, 6);
  let identical = true;
  for (let i = 0; i < expect.length; i++) if (expect[i] !== got[i]) identical = false;
  ok(identical, "the code that runs in the worker produces the reference result");

  /* And an unknown op reports an error rather than silently doing nothing. */
  const before = posted.length;
  fakeSelf.onmessage({ data: { op: "bogus", buf: new Uint8ClampedArray(16).buffer, w: 2, h: 2, params: {} } });
  ok(posted.slice(before).some(m => m.error), "an unknown op posts an error back");
}

console.log(`pixels + kernel: ${pass} total assertions passed`);


