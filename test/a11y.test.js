/* a11y.test.js — accessibility logic. DOM-free checks always run; the HTML
 * auditors (checkHeadings/auditAlt) need a DOMParser, so they run only when
 * jsdom is available (it is in the dev harness, not a site dependency). */
"use strict";
const assert = require("assert");
global.window = global;
let hasDom = false;
try { global.DOMParser = new (require("jsdom").JSDOM)("").window.DOMParser; hasDom = true; } catch (e) {}
const A = require("../assets/js/tools-a11y.js");
const VK = require("../data/catalog.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.strictEqual(a, b, m); pass++; };

/* ---- DOM-free ---- */
eq(A.contrastRatio("#000000", "#ffffff"), 21, "black/white 21");
let s = A.cvdSimulate(255, 0, 0, "achromatopsia");
ok(s.r === s.g && s.g === s.b, "achromatopsia -> grey");
s = A.cvdSimulate(255, 0, 0, "deuteranopia");
ok(s.r !== 255 || s.g !== 0, "deuteranopia shifts red");

/* captions (no DOM) */
let c = A.parseCaptions("WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nHi\n\n00:00:03.500 --> 00:00:06.000\nOverlap");
eq(c.format, "WebVTT", "detects WebVTT");
eq(c.cues, 2, "2 cues");
ok(c.issues.some(x => /Overlap/.test(x)), "detects overlap");
c = A.parseCaptions("1\n00:00:01,000 --> 00:00:02,000\nHello");
eq(c.format, "SRT", "detects SRT (comma ms)");
eq(c.cues, 1, "1 srt cue");
c = A.parseCaptions("WEBVTT\n\n00:00:05.000 --> 00:00:02.000\nBackwards");
ok(c.issues.some(x => /before/i.test(x)), "flags end-before-start");

/* ---- DOM-dependent (jsdom only) ---- */
if (hasDom) {
  let h = A.checkHeadings("<h1>A</h1><h2>B</h2><h4>C</h4>");
  ok(h.issues.some(x => /Skipped/.test(x)), "detects skipped h3");
  eq(h.headings.length, 3, "3 headings parsed");
  ok(A.checkHeadings("<h2>x</h2>").issues.some(x => /No <h1>/.test(x)), "flags missing h1");
  ok(A.checkHeadings("<h1>a</h1><h1>b</h1>").issues.some(x => /Multiple <h1>/.test(x)), "flags multiple h1");
  eq(A.checkHeadings("<h1>a</h1><h2>b</h2><h3>c</h3>").issues.length, 0, "clean hierarchy ok");
  let al = A.auditAlt('<img src="a.jpg" alt="A nice photo of a dog"><img src="b.png"><img src="c.jpg" alt="DSC_0001.jpg">');
  eq(al.summary.total, 3, "3 images");
  eq(al.summary.fail, 1, "1 missing alt");
  ok(al.summary.warn >= 1, "filename-like alt warned");
  ok(al.results[0].status === "pass", "descriptive alt passes");
} else {
  console.log("  (skipped 9 DOM auditor checks — jsdom not installed here)");
}

["accessible-palette","color-blind-simulator","heading-checker","alt-text-auditor","caption-validator"].forEach(id => { const t = VK.find(id); ok(t && t.status === "live" && t.cat === "accessibility", id + " live"); });
console.log(`a11y: ${pass} assertions passed${hasDom ? " (incl. DOM auditors)" : ""}`);

/* ---------------------------------------------------------------------------
 * CANVAS DEPTH AND TEXT CONTRAST
 *
 * Two things are pinned here, and they pull against each other — which is
 * exactly why they need pinning together.
 *
 * DEPTH. The page canvas has to sit far enough below white that white cards
 * read as objects on a surface. It used to be #fbfcfe, four points below
 * white, giving a card-to-canvas ratio of 1.027 — effectively nothing, so the
 * tool grid looked printed onto the page rather than sitting on it.
 *
 * CONTRAST. Every step deeper costs text contrast. --ink-mute was already
 * under AA at 4.47 on the old canvas before anyone touched it.
 *
 * So: a floor on depth, and a floor on contrast, asserted against the built
 * stylesheet rather than the source, because app.css is what ships.
 * ------------------------------------------------------------------------- */
{
  const fsA = require("fs"), pathA = require("path");
  const css = fsA.readFileSync(pathA.join(__dirname, "../assets/css/app.css"), "utf8");
  const tok = (n) => {
    const m = new RegExp("--" + n + ":\\s*(#[0-9a-f]{6})", "i").exec(css);
    return m ? m[1] : null;
  };
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
  const lum = (h) => {
    const [r, g, b] = rgb(h).map((c) => {
      c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const cr = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const canvas = tok("n-25");
  ok(canvas, "the canvas token is in the built stylesheet");

  /* Depth floor. iLovePDF's canvas measures 1.087 against their white cards;
     anything under 1.06 stops reading as a surface. */
  const lift = cr(canvas, "#ffffff");
  ok(lift >= 1.06,
     "white cards lift off the canvas, ratio " + lift.toFixed(3) + " (floor 1.06)");
  ok(lift <= 1.25,
     "but the canvas is not so dark it becomes a colour, ratio " + lift.toFixed(3));

  /* Contrast floor. All four of these sit directly on the canvas somewhere. */
  [["n-900", "--ink", 4.5], ["n-600", "--ink-soft", 4.5],
   ["n-500", "--ink-mute", 4.5], ["accent", "--accent", 4.5]].forEach(([t, label, min]) => {
    const c = tok(t);
    ok(c, label + " resolves in the built CSS");
    const v = cr(canvas, c);
    ok(v >= min, label + " on the canvas is " + v.toFixed(2) + ", needs " + min);
  });

  /* --ink-mute is used on white cards too, so it has to clear AA on both. */
  ok(cr("#ffffff", tok("n-500")) >= 4.5,
     "--ink-mute also clears AA on a white card, " + cr("#ffffff", tok("n-500")).toFixed(2));
}
console.log(`a11y + canvas contrast: ${pass} total assertions passed`);
