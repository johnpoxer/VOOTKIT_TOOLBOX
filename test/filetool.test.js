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
