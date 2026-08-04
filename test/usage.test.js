/* usage.test.js — the free-limit decision logic (pure). */
"use strict";
const assert = require("assert");
global.window = global;
const U = require("../assets/js/usage.js");
let pass = 0; const eq=(a,b,m)=>{assert.strictEqual(a,b,m);pass++;};
const base = { enabled: true, pro: false, exempt: false, count: 0, count_limit: 5, hard: true };
function d(o){ return U.decide(Object.assign({}, base, o)); }
eq(d({enabled:false}), "allow", "disabled -> always allow");
eq(d({pro:true, count:99}), "allow", "pro exempt regardless of count");
eq(d({exempt:true, count:99}), "allow", "exempt category always allowed");
eq(d({count:0}), "allow", "under limit allowed");
eq(d({count:4}), "allow", "at limit-1 allowed (5th use)");
eq(d({count:5}), "block", "at limit, hard -> block");
eq(d({count:9}), "block", "over limit -> block");
eq(d({count:5, hard:false}), "nudge", "at limit, soft -> nudge");
eq(d({count:5, pro:true}), "allow", "pro beats hard block");
console.log(`usage: ${pass} assertions passed`);

/* ---------------------------------------------------------------------------
 * THE SHIPPED CONFIGURATION, NOT JUST THE LOGIC
 *
 * decide() was already correct and already tested. What was wrong was
 * everything around it: the limit was switched off entirely, so "5 FREE A DAY"
 * appeared on every page while nothing counted and no upgrade moment existed
 * anywhere in the product. These assertions pin the live config, because the
 * bug was a config value rather than a branch.
 * ------------------------------------------------------------------------- */
const CFG = require("../data/site.config.js");
const ok = (c, m) => { assert.ok(c, m); pass++; };
const F = CFG.freeLimit;

ok(F.enabled, "the free limit is switched on — otherwise there is no funnel at all");
eq(F.count, 5, "five free runs, matching the '5 FREE A DAY' badge every page renders");

/* THE INTERLOCK — CORRECTED 3 Aug 2026.
 *
 * This block previously read the `price` field out of stripe.plans, found it
 * empty, and asserted hard MUST be false because "checkout does not work".
 * That was wrong twice over: the field is unused (create-checkout.js reads
 * VK_PRICE_* environment variables), and checkout has been live the whole time
 * — all four plans verified returning real Stripe Checkout URLs.
 *
 * The lesson is worth keeping: an empty config field that nothing reads is
 * worse than no field, because it invites exactly this conclusion. The field is
 * now labelled unused in site.config.js, and this test no longer keys off it.
 *
 * What remains true is the PRINCIPLE — never gate a user behind a payment path
 * that cannot complete. But that is now a runtime property of the Netlify
 * function, not something a unit test can read, so it is asserted where it can
 * be: hard:true requires a deliberate choice, and the default stays soft. */
ok(typeof F.hard === "boolean", "the hard/soft choice is explicit, not undefined");
ok(!F.hard, "the limit currently nudges rather than blocks — a product decision, not a broken-checkout workaround");

/* With a soft limit, no count can ever produce a block. */
[5, 6, 20, 500].forEach((n) => {
  eq(U.decide({ enabled: true, pro: false, exempt: false, count: n, count_limit: F.count, hard: F.hard }),
     "nudge", "a soft limit nudges at " + n + " runs and never blocks");
});

console.log(`usage + shipped config: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * A USE IS A COMPLETED RUN, NOT A PAGE VIEW
 *
 * The counter used to bump() on DOMContentLoaded. Browsing five tool pages —
 * precisely what the related-tools module is built to encourage — exhausted the
 * daily allowance having processed nothing. On a site whose entire traffic
 * strategy is organic search, that gated visitors before they saw the product
 * work even once.
 * ------------------------------------------------------------------------- */
const fs = require("fs"), path = require("path");
const usageSrc = fs.readFileSync(path.join(__dirname, "../assets/js/usage.js"), "utf8");
const convertSrc = fs.readFileSync(path.join(__dirname, "../assets/js/convert.js"), "utf8");

ok(/function countRun\(/.test(usageSrc), "there is an explicit run counter");
ok(/root\.VKUsage = \{[^}]*countRun/.test(usageSrc), "countRun is exported for the engines to call");
ok(/VKUsage && root\.VKUsage\.countRun/.test(convertSrc),
   "the shared success hook calls it — this is the only definition of a 'use'");
ok(/try \{ if \(root\.VKUsage/.test(convertSrc),
   "and it is guarded, so a counter failure cannot break the result the user came for");

/* The init path must no longer count. It may still GATE (a block has to happen
   before the work, not after a two-minute encode), but counting there is what
   caused the bug. */
const initBody = usageSrc.slice(usageSrc.indexOf("async function init()"));
ok(!/bump\(\)/.test(initBody), "page load no longer increments the counter");
ok(/!CFG\.hard/.test(initBody), "and the load-time gate is skipped entirely when the limit is soft");

/* All three engines share the hook, so all three count. */
["filetool", "widget", "calc"].forEach((engine) => {
  const src = fs.readFileSync(path.join(__dirname, "../assets/js/" + engine + ".js"), "utf8");
  ok(/VKConvert\.onToolSuccess/.test(src), engine + ".js reports success through the shared hook");
});

/* The nudge has to be worth showing. The previous implementation was a
   five-second toast that named no price and offered nothing to click. */
ok(/function showNudge\(/.test(usageSrc), "there is a real upgrade prompt");
ok(/pricing\.html/.test(usageSrc), "it links somewhere");
ok(/creator_pro_monthly/.test(usageSrc), "and names the actual price from config rather than hard-coding one");
ok(!/VKUI\.toast\('You/.test(usageSrc), "the throwaway toast is gone");

console.log(`usage + run counting: ${pass} total assertions passed`);
