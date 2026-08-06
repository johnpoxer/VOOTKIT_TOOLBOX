/* track.test.js — product analytics events.
 *
 * GA4 shipped since launch firing only gtag('config'). Measured 3 Aug 2026:
 * Key events 0 across 28 days. The site could report pageviews and nothing
 * about whether a tool was ever used, a limit ever hit, or checkout ever
 * opened — so no paid-traffic experiment could read its own result.
 *
 * The assertions that matter most here are the PRIVACY ones. Every call site is
 * inside a tool that promises files never leave the tab; an analytics call that
 * leaked a filename would break that promise from the inside. */
"use strict";
const assert = require("assert");
global.window = global;
const T = require("../assets/js/track.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); pass++; };

/* --- the allow-list fails closed --- */
{
  const dirty = {
    tool_id: "merge-pdf", tool_category: "pdf",
    /* everything below is the user's and must never be sent */
    file_name: "my-passport-scan.pdf",
    email: "someone@example.com",
    query: "how much do i owe",
    value: 48000,
    text: "confidential paste"
  };
  const out = T.clean(dirty);
  eq(Object.keys(out).sort(), ["tool_category", "tool_id"], "only allow-listed keys survive");
  ["file_name", "email", "query", "value", "text"].forEach((k) =>
    ok(!(k in out), "'" + k + "' is dropped — it is the user's, not ours"));
}

/* An allow-list rather than a deny-list, so a NEW leak fails closed. */
{
  const out = T.clean({ tool_id: "x", something_added_later: "a secret" });
  ok(!("something_added_later" in out),
     "an unrecognised key is dropped by default — a deny-list would have let this through");
}

/* Long strings are truncated, so a defect degrades to junk rather than a leak. */
{
  const out = T.clean({ tool_id: "a".repeat(500) });
  ok(out.tool_id.length <= 64, "strings are capped, got " + out.tool_id.length);
}

/* Empties are dropped rather than sent as noise. */
{
  const out = T.clean({ tool_id: "", tool_category: null, plan: undefined, source: "hdr" });
  eq(Object.keys(out), ["source"], "empty, null and undefined values are omitted");
  eq(T.clean(null), {}, "no params is not an error");
  eq(T.clean(undefined), {}, "undefined params is not an error");
}

/* Numbers pass through unstringified — runs_today is a metric, not a label. */
{
  const out = T.clean({ runs_today: 6 });
  eq(out.runs_today, 6, "numbers stay numbers");
}

console.log(`track privacy: ${pass} assertions passed`);

/* --- never throws, never fires without gtag --- */
{
  delete global.gtag;
  eq(T.send("tool_run", { tool_id: "x" }), false, "no gtag -> no send, and no throw");
  assert.doesNotThrow(() => T.toolRun("x", "pdf"), "helpers are safe with gtag absent");
  pass++;

  const seen = [];
  global.gtag = function () { seen.push(Array.prototype.slice.call(arguments)); };
  eq(T.send("tool_run", { tool_id: "merge-pdf", tool_category: "pdf" }), true, "sends when gtag exists");
  eq(seen[0][0], "event", "uses the GA4 event signature");
  eq(seen[0][1], "tool_run", "with the event name");
  eq(seen[0][2], { tool_id: "merge-pdf", tool_category: "pdf" }, "and cleaned params");

  /* A throwing gtag must not take the tool down with it. */
  global.gtag = function () { throw new Error("blocked by extension"); };
  eq(T.send("tool_run", {}), false, "a throwing gtag is swallowed");
  assert.doesNotThrow(() => T.toolDownload("x", "pdf"), "and the call site survives");
  pass++;
  eq(T.send("", {}), false, "an empty event name sends nothing");
  delete global.gtag;
}

console.log(`track safety: ${pass} total assertions passed`);

/* --- the funnel is complete and wired --- */
{
  const fs = require("fs"), path = require("path");
  const read = (f) => fs.readFileSync(path.join(__dirname, "../assets/js/" + f), "utf8");

  ["TOOL_RUN", "TOOL_DOWNLOAD", "LIMIT_REACHED", "UPGRADE_CLICK", "BEGIN_CHECKOUT", "SIGN_UP"]
    .forEach((k) => ok(T.EVENTS[k], "event " + k + " is defined"));

  /* Names are fixed in one place: GA4 matches key events by exact string, so a
     typo at a call site produces an event that silently never counts. */
  ok(/tool_run/.test(read("convert.js")) === false,
     "call sites use the helpers, not raw event-name strings");

  /* THIS CONTRACT WAS INVERTED ON PURPOSE.
   *
   * tool_download used to fire from filetool.js's download button, and this
   * test enforced that. It was wrong in two ways. It counted a download at the
   * moment the button was clicked rather than the moment the file reached the
   * user, so a gated download would have been counted as delivered. And it only
   * covered filetool.js — the four other harnesses that hand over files
   * (widget.js, tools-pdfmake.js, tools-pdftools.js, the video path) fired
   * nothing at all, so the number was quietly undercounting.
   *
   * It now fires from deliver.js, which is the single place every download
   * passes through and the only place that knows whether one actually
   * happened. The assertion below is the inverse of the old one: filetool.js
   * must NOT send it. */
  const wired = [
    ["convert.js", /VKTrack\.toolRun/, "tool_run fires from the shared success hook"],
    ["deliver.js", /VKTrack\.toolDownload/, "tool_download fires from the one delivery point"],
    ["deliver.js", /VKTrack\.signupViewed/, "signup_view fires when the gate is shown"],
    ["deliver.js", /VKTrack\.downloadUnlocked/, "download_unlocked fires when the gate is passed"],
    ["filetool.js", /VKTrack\.toolStart/, "tool_start fires before the work begins"],
    ["usage.js", /VKTrack\.limitReached/, "limit_reached fires when the nudge appears"],
    ["usage.js", /VKTrack\.upgradeClick/, "upgrade_click fires from the nudge CTA"],
    ["pricing.js", /VKTrack\.beginCheckout/, "begin_checkout fires on the plan button"],
    ["auth.js", /VKTrack\.signUp/, "sign_up fires on account creation"]
  ];
  wired.forEach(([f, re, msg]) => ok(re.test(read(f)), msg));

  /* The download event must live in exactly ONE file. Two call sites means
     double counting, and double counting a funnel step is worse than not
     counting it — it looks like data. */
  ok(!/VKTrack\.toolDownload/.test(read("filetool.js")),
     "filetool.js no longer sends tool_download — deliver.js owns it");
  ["widget.js", "tools-pdfmake.js", "tools-pdftools.js"].forEach((f) =>
    ok(!/VKTrack\.toolDownload/.test(read(f)), f + " does not send it either"));

  /* Every harness that hands a file over must go through the one door. If any
     of these regains its own a.download, the gate has a hole in it and the
     event count silently drops. */
  ["filetool.js", "widget.js", "tools-pdfmake.js", "tools-pdftools.js"].forEach((f) =>
    ok(/VKDeliver\.deliver/.test(read(f)), f + " routes downloads through VKDeliver"));

  /* New events must be declared, or a call site sends a typo'd string that GA4
     silently never counts. */
  ["TOOL_START", "SIGNUP_VIEW", "DOWNLOAD_UNLOCKED"].forEach((k) =>
    ok(T.EVENTS[k], "event " + k + " is defined"));

  /* Every call site is on a success path, so every one must be guarded. */
  ["convert.js", "filetool.js", "usage.js", "pricing.js", "auth.js", "deliver.js"].forEach((f) => {
    const s = read(f);
    const i = s.indexOf("VKTrack");
    const window_ = s.slice(Math.max(0, i - 200), i);
    ok(/try \{/.test(window_), f + " guards its VKTrack call — analytics must never break a tool");
  });

  /* begin_checkout must fire BEFORE the network call. Checkout can fail (the
     price ids are unset), and a funnel that only counts successes cannot show
     you that its last step is broken. */
  const p = read("pricing.js");
  /* Match the actual fetch, not the word "create-checkout" in the file header
     comment — which is what the first version of this assertion caught. */
  ok(p.indexOf("VKTrack.beginCheckout") < p.indexOf("await fetch('/.netlify/functions/create-checkout'"),
     "intent is recorded before the request that may fail");

  /* sign_up must not carry identity. */
  const a = read("auth.js");
  ok(/VKTrack\.signUp\('password'\)/.test(a), "sign_up carries a method, not an identity");
  ok(!/signUp\([^)]*email/.test(a.slice(a.indexOf("VKTrack.signUp") - 100, a.indexOf("VKTrack.signUp") + 60)),
     "the email address is not passed to analytics");
  ok(/!r\.error/.test(a), "and it only fires on success");

  /* The delegated listener covers pricing links site-wide. */
  const t = read("track.js");
  ok(/a\[href\*="pricing"\]/.test(t), "one delegated listener covers every route to pricing");
  ok(/usage-nudge'\)\) return/.test(t), "and does not double-count the nudge, which reports its own source");

  /* Loaded on pages. */
  ok(/assets\/js\/track\.js/.test(fs.readFileSync(path.join(__dirname, "../build.js"), "utf8")),
     "track.js is loaded by the page template");
}

/* pageSource reports a category, never a full path with a query string. */
{
  const cases = [
    ["/tools/pdf/merge-pdf/", "tool_pdf"],
    ["/tools/finance/loan-calculator/", "tool_finance"],
    ["/pricing.html", "pricing.html"],
    ["/", "home"]
  ];
  cases.forEach(([p, want]) => {
    global.location = { pathname: p };
    eq(T.pageSource(), want, p + " -> " + want);
  });
  global.location = { pathname: "/account/?token=secret123" };
  ok(T.pageSource().indexOf("secret123") === -1, "a query string never reaches the event");
}

console.log(`track funnel: ${pass} total assertions passed`);
