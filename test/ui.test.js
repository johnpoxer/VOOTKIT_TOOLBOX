/* ui.test.js — component library pure helpers + DOM primitives (jsdom). */
"use strict";
const assert = require("assert");
let hasDom = false, JSDOM;
try { JSDOM = require("jsdom").JSDOM; hasDom = true; } catch (e) {}
global.window = global;
const UI = require("../assets/js/ui.js");
const VK = require("../data/catalog.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.strictEqual(a, b, m); pass++; };

/* upPrefix — relative path back to site root at any depth */
eq(UI.upPrefix("/"), "", "root -> ''");
eq(UI.upPrefix("/tools/"), "../", "tools -> ../");
eq(UI.upPrefix("/tools/pdf/"), "../../", "category -> ../../");
eq(UI.upPrefix("/tools/pdf/merge-pdf/"), "../../../", "tool -> ../../../");
eq(UI.upPrefix("/components/"), "../", "components -> ../");
eq(UI.upPrefix("/privacy.html"), "", "root file -> ''");

/* paletteFilter delegates to VK.search */
eq(UI.paletteFilter(VK, "", 8).length, 0, "empty query -> nothing");
let r = UI.paletteFilter(VK, "pdf", 8);
ok(r.length > 0 && r.length <= 8, "pdf query returns capped results");
ok(r.every(t => /pdf/i.test(t.name + " " + t.desc + " " + t.kw + " " + t.cat)), "results are relevant");

/* DOM primitives */
if (hasDom) {
  const dom = new JSDOM("<!doctype html><body></body>", { url: "https://vootkit.com/tools/pdf/merge-pdf/", pretendToBeVisual: true });
  const w = dom.window;
  global.document = w.document; global.window = w; w.VK = VK;
  // re-require against this DOM
  delete require.cache[require.resolve("../assets/js/ui.js")];
  const U = require("../assets/js/ui.js");

  // toast
  U.toast("Hello", { type: "ok", duration: 9999 });
  ok(w.document.querySelector(".vk-toast"), "toast renders");
  ok(w.document.querySelector(".vk-toasts[aria-live=polite]"), "toast region is a live region");

  // modal — focus trap attributes + ESC close
  const m = U.modal({ title: "Test", content: "<button>Inside</button>" });
  const dlg = w.document.querySelector(".vk-modal[role=dialog]");
  ok(dlg && dlg.getAttribute("aria-modal") === "true", "modal is aria-modal");
  ok(dlg.getAttribute("aria-labelledby"), "modal labelled by title");
  m.close();

  // tabs — roving activation
  w.document.body.innerHTML = '<div data-tabs><div role="tablist"><button role="tab" id="a" aria-controls="pa">A</button><button role="tab" id="b" aria-controls="pb">B</button></div><div role="tabpanel" id="pa">A</div><div role="tabpanel" id="pb">B</div></div>';
  U.initTabs();
  const tabs = w.document.querySelectorAll('[role=tab]');
  eq(tabs[0].getAttribute("aria-selected"), "true", "first tab selected");
  eq(w.document.getElementById("pb").hidden, true, "second panel hidden");
  tabs[1].click();
  eq(tabs[1].getAttribute("aria-selected"), "true", "clicking activates second tab");
  eq(w.document.getElementById("pa").hidden, true, "first panel now hidden");
  console.log(`ui: ${pass} assertions passed (incl. DOM)`);
} else {
  console.log(`ui: ${pass} assertions passed (DOM skipped — no jsdom)`);
}
