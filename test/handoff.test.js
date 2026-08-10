/* handoff.test.js — sending a finished file into the next tool.
 *
 * The dangerous failure here is not a crash, it is a WRONG OFFER: suggesting a
 * tool that will refuse the file. By the time the user finds out they have
 * navigated, lost the result panel, and have to go back and download again.
 * So the compatibility rules get the most attention, and every one of them is
 * biased toward saying no.
 *
 * The second failure is a chain offered on a download that never happened —
 * see test/deliver.test.js for the gate paths.
 */
"use strict";
const assert = require("assert");
global.window = global;
const H = require("../assets/js/handoff.js");
const D = require("../data/tool-flow.js");
const VK = require("../data/catalog.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); pass++; };

/* --- accept matching ------------------------------------------------------ */
/* MIME and extension both count, because accept lists carry both — a Windows
   dialog builds its filter from the extensions. */
ok(H.accepts("application/pdf,.pdf", "a.pdf", "application/pdf"), "pdf by mime");
ok(H.accepts("application/pdf,.pdf", "a.pdf", ""), "pdf by extension when the mime is blank");
ok(H.accepts("application/pdf,.pdf", "A.PDF", ""), "extension matching is case-insensitive");
ok(H.accepts("image/*", "x.webp", "image/webp"), "the wildcard form");
ok(H.accepts("image/png,image/*", "x.gif", "image/gif"), "a wildcard anywhere in the list");
ok(H.accepts(".svg,image/svg+xml", "logo.svg", ""), "an extension-only entry");

/* Everything below must be refused. Each one is a tool that would have thrown
   an error at the user AFTER they navigated. */
[
  ["application/pdf,.pdf", "a.png", "image/png", "a png into a pdf-only tool"],
  ["image/*", "a.pdf", "application/pdf", "a pdf into an image tool"],
  ["video/*", "a.png", "image/png", "an image into a video tool"],
  ["image/*", "a.pdfx", "", "a near-miss extension"],
  ["", "a.pdf", "application/pdf", "an empty accept refuses everything"],
  [null, "a.pdf", "application/pdf", "a missing accept refuses everything"],
  ["application/pdf", "noext", "", "no extension and no mime"]
].forEach(([a, n, m, why]) => ok(!H.accepts(a, n, m), "refuses " + why));

/* --- freshness ------------------------------------------------------------ */
ok(H.isFresh({ at: Date.now() }), "just parked is fresh");
ok(H.isFresh({ at: Date.now() - 9 * 60 * 1000 }), "nine minutes is still fresh");
ok(!H.isFresh({ at: Date.now() - 11 * 60 * 1000 }), "eleven minutes is stale");
ok(!H.isFresh(null), "nothing is not fresh");
ok(!H.isFresh({}), "a record with no timestamp is not fresh");
/* A clock that jumped backwards must not resurrect an old file. */
ok(!H.isFresh({ at: Date.now() + 60 * 1000 }), "a future timestamp is not fresh");

/* --- what comes next ------------------------------------------------------ */
{
  const n = H.nextTools(D, "merge-pdf", "merged.pdf", "application/pdf", 5);
  eq(n.length, 5, "the row is capped");
  ok(!n.some((x) => x.id === "merge-pdf"), "never offers the tool you are already on");
  ok(n.every((x) => H.accepts(D.flow[x.id].a, "merged.pdf", "application/pdf")),
     "every tool offered would actually take the file");
  eq(n[0].id, "compress-pdf", "the most common next step leads, not the alphabet");

  /* Every suggestion must be a real, live tool with a page to land on. */
  n.forEach((x) => {
    const t = VK.find(x.id);
    ok(t, "suggestion " + x.id + " is a real tool");
    ok(t.status === "live", "suggestion " + x.id + " is live, not coming-soon");
  });
}

/* An image output must never suggest PDF-only tools, and vice versa. */
{
  const img = H.nextTools(D, "compress-image", "out.png", "image/png", 8);
  ok(img.length > 0, "an image has somewhere to go");
  ok(img.every((x) => H.accepts(D.flow[x.id].a, "out.png", "image/png")),
     "no pdf-only tool is offered for an image");
  const vid = H.nextTools(D, "compress-video", "out.mp4", "video/mp4", 8);
  ok(vid.every((x) => H.accepts(D.flow[x.id].a, "out.mp4", "video/mp4")),
     "no image tool is offered for a video");
}

/* A type nothing accepts produces no row at all, rather than a row of tools
   that will all reject it. */
eq(H.nextTools(D, "word-counter", "notes.txt", "text/plain", 5).length, 0,
   "a plain text file gets no suggestions");
eq(H.nextTools(D, "merge-pdf", "m.pdf", "application/pdf", 0).length, 0, "a zero cap yields nothing");
eq(H.nextTools(null, "merge-pdf", "m.pdf", "application/pdf", 5).length, 0, "no data, no suggestions");

/* --- the generated map itself --------------------------------------------- */
{
  const ids = Object.keys(D.flow);
  ok(ids.length >= 60, "the flow map covers the file tools, got " + ids.length);
  const bogus = ids.filter((id) => !VK.find(id));
  eq(bogus.length, 0, "every id in the flow map is a real tool: " + bogus.slice(0, 5).join(", "));
  const dead = ids.filter((id) => (VK.find(id) || {}).status !== "live");
  eq(dead.length, 0, "nothing coming-soon is chainable: " + dead.slice(0, 5).join(", "));
  const noAccept = ids.filter((id) => !D.flow[id].a);
  eq(noAccept.length, 0, "every entry carries an accept string");
  ids.forEach((id) => { if (!D.names[id]) ok(false, id + " has no display name"); });
  ok(true, "every chainable tool has a display name");
}

console.log(`handoff: ${pass} assertions passed`);
