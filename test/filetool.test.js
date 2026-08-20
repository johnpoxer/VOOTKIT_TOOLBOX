/* filetool.test.js — validation logic for file tools. */
"use strict";
const assert = require("assert");
global.window = global;
const VKFile = require("../assets/js/filetool.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const f = (name, size, type) => ({ name, size, type });

/* zero-byte */
ok(/empty/.test(VKFile.validate([f("a.png", 0, "image/png")], { accept: "image/*" })), "rejects 0-byte file");

/* oversize */
let msg = VKFile.validate([f("big.png", 50 * 1024 * 1024, "image/png")], { accept: "image/*", maxBytes: 40 * 1024 * 1024 });
ok(/limit here is/.test(msg), "rejects oversize with a helpful message: " + msg);

/* wrong type */
ok(/doesn’t look like an image/.test(VKFile.validate([f("doc.pdf", 1000, "application/pdf")], { accept: "image/*" })), "rejects non-image for image tool");
ok(/doesn’t look like a PDF/.test(VKFile.validate([f("x.png", 1000, "image/png")], { accept: "application/pdf" })), "rejects non-PDF for PDF tool");

/* too many files */
ok(/Up to 2 files/.test(VKFile.validate([f("a.png",1,"image/png"),f("b.png",1,"image/png"),f("c.png",1,"image/png")], { accept: "image/*", maxFiles: 2 })), "enforces max file count");

/* happy paths */
ok(VKFile.validate([f("ok.png", 1024, "image/png")], { accept: "image/*", maxBytes: 40*1024*1024 }) === null, "accepts a valid image");
ok(VKFile.validate([f("ok.pdf", 2048, "application/pdf")], { accept: "application/pdf" }) === null, "accepts a valid PDF");
/* files with no MIME type (some OSes) should not be rejected outright */
ok(VKFile.validate([f("photo.jpg", 5000, "")], { accept: "image/*" }) === null, "allows empty MIME type");

/* byte formatting */
assert.strictEqual(VKFile.bytes(512), "512 B"); pass++;
assert.strictEqual(VKFile.bytes(2048), "2.0 KB"); pass++;
assert.strictEqual(VKFile.bytes(5 * 1048576), "5.00 MB"); pass++;

/* every image tool spec is structurally sound */
const IMG = require("../assets/js/tools-image.js");
const VK = require("../data/catalog.js");
const ids = Object.keys(IMG);
assert.strictEqual(ids.length, 13, "13 image/canvas tools (incl. emote-resizer, flip, rotate, circle-crop, grayscale)"); pass++;
ids.forEach(id => {
  const t = VK.find(id);
  ok(t, `${id} in catalog`);
  ok(t.status === "live", `${id} marked live`);
  ok(t.processing === "local", `${id} is local-processing`);
  const s = IMG[id];
  ok(typeof s.process === "function", `${id} has process()`);
  ok(typeof s.accept === "string" && s.accept, `${id} declares accept`);
  ok(Array.isArray(s.options), `${id} has options array`);
  (s.options || []).forEach(o => {
    ok(o.k && o.label, `${id} option ${o.k} labelled`);
    if (o.type === "select") ok(Array.isArray(o.options) && o.options.length, `${id} select ${o.k} has choices`);
  });
});
console.log(`filetool: ${pass} assertions passed`);

/* ---------------------------------------------------------------------------
 * PICKING FILES ONE AT A TIME (the "cannot select two PDFs on desktop" bug)
 *
 * Reported as: merge-pdf works on mobile, not on desktop. The input always had
 * `multiple`, so it was never a missing attribute. The cause was that a desktop
 * file dialog REPLACES its selection each time it opens, and the tool kept only
 * the latest pick — so a two-file merge required knowing to ctrl-click both in
 * one visit to the dialog. A phone picker uses checkboxes, which made
 * multi-select obvious there and invisible here.
 *
 * These assertions pin the append behaviour, because the failure is silent: the
 * tool looks like it is working, it just quietly forgets the first file.
 * ------------------------------------------------------------------------- */
{
  const F = (name, size, lastModified) => ({ name, size, type: "application/pdf", lastModified: lastModified == null ? size : lastModified });
  const names = (a) => a.map((f) => f.name).join(",");
  const merge = VKFile.mergeSelection;
  const eq = (a2, b2, m) => { assert.strictEqual(a2, b2, m); pass++; };

  const a = F("a.pdf", 100), b = F("b.pdf", 200), c = F("c.pdf", 300);

  /* The bug, directly. */
  eq(names(merge([a], [b], true)), "a.pdf,b.pdf",
     "a second pick ADDS to the first — this is the desktop fix");
  eq(names(merge(merge([], [a], true), [b], true)), "a.pdf,b.pdf",
     "one at a time builds the list");
  eq(names(merge([], [a, b], true)), "a.pdf,b.pdf",
     "ctrl-clicking both at once still works");
  eq(names(merge([a, b], [c], true)), "a.pdf,b.pdf,c.pdf",
     "a third file lands at the end — merge order is add order");

  /* Order is the product on a merge tool: appending must never reshuffle. */
  eq(names(merge([c, a, b], [], true)), "c.pdf,a.pdf,b.pdf",
     "an empty pick leaves the existing order untouched");

  /* Re-picking a file you already added is a mistake, not a request for two
     copies of the same document in the merge. */
  eq(names(merge([a, b], [a], true)), "a.pdf,b.pdf", "the same file is not added twice");
  eq(names(merge([a], [F("a.pdf", 100)], true)), "a.pdf",
     "identity is name + size + lastModified, not object identity");
  eq(names(merge([a], [F("a.pdf", 999)], true)), "a.pdf,a.pdf",
     "same name but a different file IS a different file");

  /* Single-file tools must NOT accumulate: choosing another photo to resize
     means instead of, not as well as. */
  eq(names(merge([a], [b], false)), "b.pdf", "a single-file tool replaces");
  eq(names(merge([a, b], [c], false)), "c.pdf", "and never keeps a backlog");

  /* Defensive: the picker hands over a FileList, not an array, and callers
     have been known to pass nothing at all. */
  eq(names(merge(null, [a], true)), "a.pdf", "a null existing list is treated as empty");
  eq(names(merge([a], null, true)), "a.pdf", "a null pick changes nothing");
  eq(merge([], [], true).length, 0, "nothing in, nothing out");

  /* The returned array must be a new one — mutating it (reorder, remove) must
     not reach back into whatever the caller held. */
  const held = [a];
  const got = merge(held, [b], true);
  got.push(c);
  eq(held.length, 1, "the caller's array is not mutated");
}

/* PDF-only detection survives the extension being added to `accept`.
 * Windows file dialogs build their filter from EXTENSIONS, so a bare
 * 'application/pdf' can leave the user's PDFs greyed out in the dialog —
 * which is the second half of the same bug report. */
ok(VKFile.validate([f("ok.pdf", 2048, "application/pdf")], { accept: "application/pdf,.pdf" }) === null,
   "a PDF passes a tool that accepts 'application/pdf,.pdf'");
ok(/doesn’t look like a PDF/.test(VKFile.validate([f("x.png", 1000, "image/png")], { accept: "application/pdf,.pdf" })),
   "and a PNG is still rejected there");
ok(VKFile.validate([f("photo.png", 1000, "image/png")], { accept: "application/pdf,.pdf,image/*" }) === null,
   "a tool that accepts PDFs AND images does not reject the images");

/* The shared lifecycle is part of every file tool's product contract. These
 * source checks catch accidental removal even in this dependency-light test
 * environment, where a full browser DOM is intentionally unavailable. */
const lifecycleSource = require("fs").readFileSync(require("path").join(__dirname, "../assets/js/filetool.js"), "utf8");
ok(/ut-progress-ring[\s\S]*role:\s*'progressbar'/.test(lifecycleSource), "processing ring exposes progressbar semantics");
ok(/aria-valuenow/.test(lifecycleSource), "processing progress publishes its numeric value");
ok(/ut-processing-steps/.test(lifecycleSource), "processing view includes named stages");
ok(/USER_CANCELLED/.test(lifecycleSource), "long-running work has a safe cancellation path");
ok(/aria-busy/.test(lifecycleSource), "workspace exposes its busy state");
ok(/Process another file|Start with new files/.test(lifecycleSource), "completed state offers a clear restart action");

console.log(`filetool + multi-select: ${pass} total assertions passed`);
