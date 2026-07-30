/* convert.test.js — Phase 2 tool-completion capture.
 *
 * The prompt fires on every successful file-tool run across ~100 tools, so the
 * decision logic has to be exactly right in both directions: showing it to a
 * signed-in user is embarrassing, showing it again to someone who already said
 * "not now" is worse, and never showing it makes the whole thing pointless. */
"use strict";
const assert = require("assert");
global.window = global;
const C = require("../assets/js/convert.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); pass++; };

const NOW = Date.UTC(2026, 6, 31);
const daysAgo = n => new Date(NOW - n * 86400000).toISOString();

/* --- never prompt a signed-in user: they already converted --- */
ok(!C.shouldPrompt({ signedIn: true, distinctTools: 99, now: NOW }), "signed-in user is never prompted");
ok(!C.shouldPrompt({ signedIn: true, distinctTools: 3, dismissedAt: null, now: NOW }), "signed in beats every other signal");

/* --- not before they look like a returning user --- */
ok(!C.shouldPrompt({ signedIn: false, distinctTools: 0, now: NOW }), "no prompt on zero tools");
ok(!C.shouldPrompt({ signedIn: false, distinctTools: 1, now: NOW }), "no prompt on first tool — too early to ask");
ok(!C.shouldPrompt({ signedIn: false, distinctTools: 2, now: NOW }), "no prompt on second tool");
ok(C.shouldPrompt({ signedIn: false, distinctTools: 3, now: NOW }), "prompts on the third distinct tool");
ok(C.shouldPrompt({ signedIn: false, distinctTools: 20, now: NOW }), "keeps prompting a heavy user");

/* --- "not now" must actually mean not now --- */
ok(!C.shouldPrompt({ signedIn: false, distinctTools: 5, dismissedAt: daysAgo(0), now: NOW }), "dismissed today -> silent");
ok(!C.shouldPrompt({ signedIn: false, distinctTools: 5, dismissedAt: daysAgo(1), now: NOW }), "dismissed yesterday -> silent");
ok(!C.shouldPrompt({ signedIn: false, distinctTools: 5, dismissedAt: daysAgo(13), now: NOW }), "still silent inside the cooldown");
ok(C.shouldPrompt({ signedIn: false, distinctTools: 5, dismissedAt: daysAgo(14), now: NOW }), "asks again after the cooldown");
ok(C.shouldPrompt({ signedIn: false, distinctTools: 5, dismissedAt: daysAgo(400), now: NOW }), "asks again long after");

/* --- corrupt stored state must not silently disable conversion forever.
   NaN comparisons are always false, so a naive elapsed>=days check suppressed
   the prompt permanently once a single unparseable value was stored. --- */
ok(C.shouldPrompt({ signedIn: false, distinctTools: 5, dismissedAt: "not-a-date", now: NOW }),
   "unparseable dismissedAt is treated as never dismissed, not as a dismissal");
ok(C.shouldPrompt({ signedIn: false, distinctTools: 5, dismissedAt: "", now: NOW }),
   "empty dismissedAt does not suppress");
ok(C.shouldPrompt({ signedIn: false, distinctTools: 5, dismissedAt: "{}", now: NOW }),
   "garbage JSON in dismissedAt does not suppress");
let threw = false;
try { C.shouldPrompt(null); C.shouldPrompt(undefined); C.shouldPrompt({}); } catch (e) { threw = true; }
ok(!threw, "shouldPrompt survives missing state");

/* --- thresholds are configurable, and the defaults are what we think they are --- */
ok(C.shouldPrompt({ signedIn: false, distinctTools: 1, minTools: 1, now: NOW }), "minTools override respected");
eq(C.MIN_TOOLS, 3, "default threshold is 3 distinct tools");
eq(C.COOLDOWN_DAYS, 14, "default cooldown is 14 days");

/* --- distinct-tool tracking: DISTINCT is the point. Using one tool ten times
       is not the same signal as using ten tools once. --- */
eq(C.addTool([], "pdf-compressor"), ["pdf-compressor"], "first tool recorded");
eq(C.addTool(["pdf-compressor"], "pdf-compressor"), ["pdf-compressor"], "same tool twice stays distinct");
eq(C.addTool(["a"], "b"), ["a", "b"], "second distinct tool appended");
eq(C.addTool(null, "a"), ["a"], "null list handled");
eq(C.addTool(undefined, "a"), ["a"], "undefined list handled");
eq(C.addTool(["a"], ""), ["a"], "empty id ignored");
eq(C.addTool(["a"], null), ["a"], "null id ignored");
eq(C.addTool(["a"], "  b  "), ["a", "b"], "id trimmed");
ok(C.addTool(Array.from({ length: 100 }, (_, i) => "t" + i), "new").length <= 100, "list is bounded");

/* --- copy must never promise file storage: files are never uploaded, and the
       same page carries a "runs on your device" badge. A CTA that contradicts
       the page it sits on costs more trust than it converts. --- */
[0, 3, 8, 50].forEach(n => {
  const copy = C.promptCopy(n);
  ok(copy.title && copy.body, `copy present for ${n} tools`);
  const all = (copy.title + " " + copy.body).toLowerCase();
  ok(!/save your files?\b/.test(all), `copy for ${n} does not promise to save files`);
  ok(!/\bupload/.test(all), `copy for ${n} does not mention uploading`);
  ok(!/\bstore your files?\b/.test(all), `copy for ${n} does not promise file storage`);
});
ok(/history|favourite|toolkit/i.test(C.promptCopy(3).body), "copy offers what actually exists");
ok(C.promptCopy(12).title.includes("12"), "heavy-user copy reflects real usage");

/* --- the source must carry the privacy reassurance, and must not upload --- */
const src = require("fs").readFileSync(require("path").join(__dirname, "../assets/js/convert.js"), "utf8");
ok(/Your files stay on your device either way/.test(src), "prompt states files are unaffected by signing up");
ok(!/storage\.from\(|\.upload\(/.test(src), "convert.js never uploads anything");
ok(/from\('history'\)/.test(src), "records tool history for signed-in users");
ok(/tool_id: String\(toolId\)/.test(src), "history stores the tool id, not the file");
ok(!/file\.name|files\[0\]\.name/.test(src), "no file name ever touches the conversion layer");

console.log(`convert: ${pass} assertions passed`);
