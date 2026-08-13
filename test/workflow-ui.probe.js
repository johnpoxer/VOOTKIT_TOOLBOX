/* Probe: mount the real builder and report what it renders.

   This loads assets/js/workflow.js as the browser gets it, mounts the editor
   into a real DOM, and prints the structure. It is a probe, not a test — the
   point is to see what is actually there before changing anything, because
   every previous mistake on this page came from reasoning about markup I had
   assembled by hand rather than markup the code produced. */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("/tmp/jd/node_modules/jsdom");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const dom = new JSDOM(`<!doctype html><html><body><div id="host"></div></body></html>`, {
  url: "https://www.vootkit.com/workflows/",
  runScripts: "outside-only",
  pretendToBeVisual: true
});
const { window } = dom;
global.window = window;
global.document = window.document;
global.navigator = window.navigator;

/* The page's own dependency order. */
for (const f of ["data/site.config.js", "data/catalog.js", "data/tool-flow.js", "assets/js/workflow.js"]) {
  try { window.eval(read(f)); } catch (e) { console.log("LOAD FAIL " + f + ": " + e.message); }
}

const VKW = window.VKWorkflow || window.VKFlow || window.VKWorkflows;
console.log("workflow global:", VKW ? Object.keys(VKW).join(", ") : "NOT FOUND");

if (VKW && typeof VKW.mount === "function") {
  const host = window.document.getElementById("host");
  try { VKW.mount(host); } catch (e) { console.log("MOUNT THREW: " + e.message); }

  const q = (s) => host.querySelectorAll(s).length;
  console.log("\n--- structure ---");
  [
    ["palette", ".wfc-pal"], ["palette items", ".wfc-pal-list > *"],
    ["categories", ".wfc-cat"], ["recommended", ".wfc-recommended"],
    ["canvas", ".wfc-canvas"], ["nodes", ".wfc-node"],
    ["step numbers", ".wfc-stepno"], ["+ inserters", ".wfc-connector-add"],
    ["add-step dropzone", ".wfc-add-step"], ["inspector", ".wfc-panel"],
    ["status strip", ".wfc-status"], ["privacy badge", ".wfc-privacy"],
    ["estimate", ".wfc-estimate"], ["run button", ".wfc-run-main"],
    ["templates", ".wfc-temps"], ["template cards", ".wfc-temp"],
    ["undo/redo", ".wfc-undo, .wfc-redo"], ["saved status", ".wfc-saved-status"]
  ].forEach(([label, sel]) => console.log(String(q(sel)).padStart(4) + "  " + label));

  const priv = host.querySelector(".wfc-privacy");
  console.log("\nprivacy badge text:", priv ? JSON.stringify(priv.textContent.trim()) : "(none)");
  const st = host.querySelector(".wfc-status");
  console.log("status strip text :", st ? JSON.stringify(st.textContent.replace(/\s+/g, " ").trim().slice(0, 160)) : "(none)");
} else {
  console.log("no mount() — cannot probe");
}

/* --- locality: does the badge tell the truth? --- */
console.log("\n--- locality ---");
if (VKW && VKW.__locality) {
  [[], ["compress-image"], ["compress-image", "url-shortener"], ["url-shortener", "currency-converter"]]
    .forEach(function (s) {
      var r = VKW.__locality(s);
      console.log(JSON.stringify(s).padEnd(42) + " -> " + r.short.padEnd(16) + " | " + r.label);
    });
} else console.log("__locality not exported");
