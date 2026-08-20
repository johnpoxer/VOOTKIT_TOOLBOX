/* audit-tools.js — Phase 0 platform audit.
 *
 * Every tool page is a static HTML file with a <div id="workspace" data-tool="…">
 * that some assets/js/tools-*.js module is expected to mount into. Nothing
 * enforces that contract at build time, so a tool can ship with an id no module
 * claims — the page loads, looks fine, and the workspace silently stays empty.
 * That is the single highest-value thing to check across 290+ tools.
 *
 * This script is static: it parses the HTML and the JS registries rather than
 * running a browser, so it is fast enough to run on every commit.
 *
 *   node test/audit-tools.js            human-readable report
 *   node test/audit-tools.js --json     machine-readable, for the registry
 *   node test/audit-tools.js --strict   exit 1 if any CRITICAL issue exists
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const JSDIR = path.join(ROOT, "assets", "js");
const TOOLSDIR = path.join(ROOT, "tools");

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const strict = args.includes("--strict");

/* ---------- 1. which tool ids does the JS actually implement? ---------- */

/* Which tool ids does a module know about?
 *
 * Registration is NOT uniform across the codebase, and matching one shape gives
 * badly wrong answers. The shapes actually in use:
 *     var T     = { 'id': spec }    most widget + file tools
 *     var TOOLS = { 'id': spec }    tools-calc2, tools-money, tools-video
 *     var DOCS  = { 'id': spec }    tools-docs (T is derived from DOCS later)
 *     host.getAttribute('data-tool') !== 'id'   tools-linktools, bound directly
 * Matching only `var T` reported 47 working calculators as broken; adding TOOLS
 * still reported 6; adding a slug heuristic still reported 5. Guessing shapes
 * kept producing false alarms, so we invert it: take the ids the PAGES declare
 * and ask which modules contain that exact id as a quoted string literal. That
 * is registration-shape agnostic and cannot be defeated by a new pattern. */

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name === "index.html") out.push(p);
  }
  return out;
}

const pages = walk(TOOLSDIR);

/* every data-tool id declared anywhere in the site */
const declaredIds = new Set();
for (const f of pages) {
  const m = /<div[^>]*id=["']workspace["'][^>]*data-tool=["']([^"']+)["']/.exec(fs.readFileSync(f, "utf8"));
  if (m) declaredIds.add(m[1]);
}

/* Only tools-*.js modules mount workspaces. home.js also lists tool ids — it
   builds the homepage grid and search index — so including it reported nine
   tools as doubly-registered when nothing is actually registered twice. */
const jsFiles = fs.readdirSync(JSDIR).filter(f => /^tools-.*\.js$/.test(f) && f !== "tools-directory.js");
const idToModule = new Map();
for (const f of jsFiles) {
  const src = fs.readFileSync(path.join(JSDIR, f), "utf8");
  for (const id of declaredIds) {
    // the id must appear as a quoted literal — 'stopwatch' / "convert-video"
    if (src.includes("'" + id + "'") || src.includes('"' + id + '"')) {
      if (!idToModule.has(id)) idToModule.set(id, []);
      idToModule.get(id).push(f);
    }
  }
}
const findings = [];
const registry = [];

function add(sev, tool, issue) { findings.push({ sev, tool, issue }); }

for (const file of pages) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");

  // category index pages have no workspace — skip them
  const ws = /<div[^>]*id=["']workspace["'][^>]*>/.exec(html);
  const dataTool = ws && /data-tool=["']([^"']+)["']/.exec(ws[0]);
  if (!ws) continue;

  const id = dataTool ? dataTool[1] : null;
  const scripts = [...html.matchAll(/<script[^>]*src=["']([^"']+)["']/g)].map(m => m[1]);
  const localScripts = scripts
    .filter(s => s.indexOf("http") !== 0)
    .map(s => path.basename(s.split("?")[0]));

  const issues = [];

  /* CRITICAL: a workspace with no id, or an id nothing implements, is a tool
     that renders an empty box to every visitor who lands on it. */
  if (!id) {
    add("CRITICAL", rel, "workspace has no data-tool id — nothing can mount");
    issues.push("no-data-tool");
  } else if (!idToModule.has(id)) {
    add("CRITICAL", rel, `data-tool "${id}" is not implemented by any assets/js module`);
    issues.push("unimplemented");
  } else {
    // the implementing module must actually be loaded on this page
    const owners = idToModule.get(id);
    if (!owners.some(o => localScripts.includes(o))) {
      add("CRITICAL", rel, `data-tool "${id}" is implemented in ${owners.join(" / ")} but that script is not loaded on the page`);
      issues.push("module-not-loaded");
    }
    if (owners.length > 1) {
      add("MEDIUM", rel, `data-tool "${id}" is registered in ${owners.length} modules (${owners.join(", ")}) — last one loaded wins`);
      issues.push("duplicate-registration");
    }
  }

  /* HIGH: broken relative references break the page shell itself. */
  const dir = path.dirname(file);
  const refs = [
    ...[...html.matchAll(/<script[^>]*src=["']([^"']+)["']/g)].map(m => m[1]),
    ...[...html.matchAll(/<link[^>]*href=["']([^"']+\.css[^"']*)["']/g)].map(m => m[1])
  ].filter(r => r.indexOf("http") !== 0 && r.indexOf("//") !== 0);
  for (const r of refs) {
    const target = path.join(dir, r.split("?")[0]);
    if (!fs.existsSync(target)) {
      add("HIGH", rel, `missing local asset: ${r}`);
      issues.push("missing-asset");
    }
  }

  /* MEDIUM: SEO basics the protocol's Phase 7 requires on every tool page. */
  const title = /<title>([^<]*)<\/title>/.exec(html);
  const desc = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/.exec(html);
  const canon = /<link[^>]*rel=["']canonical["']/.test(html);
  const h1 = /<h1[^>]*>/.test(html);
  if (!title || !title[1].trim()) { add("MEDIUM", rel, "no <title>"); issues.push("no-title"); }
  else if (title[1].length > 65) { add("LOW", rel, `title is ${title[1].length} chars (Google truncates past ~60)`); issues.push("long-title"); }
  if (!desc || !desc[1].trim()) { add("MEDIUM", rel, "no meta description"); issues.push("no-description"); }
  if (!canon) { add("MEDIUM", rel, "no canonical URL"); issues.push("no-canonical"); }
  if (!h1) { add("MEDIUM", rel, "no <h1>"); issues.push("no-h1"); }

  /* LOW: FAQ + related-tools are the protocol's anti-dead-end requirements. */
  if (!/<details>/.test(html)) { add("LOW", rel, "no FAQ section"); issues.push("no-faq"); }
  if (!/Next in|Related/i.test(html)) { add("LOW", rel, "no related-tools section"); issues.push("no-related"); }

  const weight = { CRITICAL: 40, HIGH: 15, MEDIUM: 6, LOW: 2 };
  const lost = findings
    .filter(f => f.tool === rel)
    .reduce((n, f) => n + weight[f.sev], 0);

  registry.push({
    tool: id || "(none)",
    page: rel,
    category: rel.split("/")[1] || "",
    module: id && idToModule.has(id) ? idToModule.get(id).join(",") : null,
    issues,
    score: Math.max(0, 100 - lost)
  });
}

/* ---------- 4. report ---------- */

if (asJson) {
  console.log(JSON.stringify({ registry, findings }, null, 2));
} else {
  const bySev = s => findings.filter(f => f.sev === s);
  console.log(`\nVOOTKIT PLATFORM AUDIT — ${registry.length} tool pages, ${idToModule.size} implemented tool ids\n`);
  for (const sev of ["CRITICAL", "HIGH", "MEDIUM", "LOW"]) {
    const list = bySev(sev);
    console.log(`${sev}: ${list.length}`);
    const show = sev === "CRITICAL" || sev === "HIGH" ? list : list.slice(0, 8);
    for (const f of show) console.log(`   ${f.tool}\n      ${f.issue}`);
    if (show.length < list.length) console.log(`   … and ${list.length - show.length} more`);
    console.log("");
  }
  if (false) {
    console.log(`Implemented but no page uses them (${orphans.length}): ${orphans.join(", ")}\n`);
  }
  const avg = registry.reduce((n, r) => n + r.score, 0) / (registry.length || 1);
  const banded = { Platinum: 0, Gold: 0, Silver: 0, "Needs fix": 0 };
  for (const r of registry) {
    if (r.score >= 90) banded.Platinum++;
    else if (r.score >= 80) banded.Gold++;
    else if (r.score >= 70) banded.Silver++;
    else banded["Needs fix"]++;
  }
  console.log(`Average tool score: ${avg.toFixed(1)}/100`);
  console.log(`Quality bands: ${Object.entries(banded).map(([k, v]) => `${k} ${v}`).join("  ·  ")}\n`);
}

if (strict && findings.some(f => f.sev === "CRITICAL")) {
  console.error("FAIL: critical issues present");
  process.exit(1);
}
