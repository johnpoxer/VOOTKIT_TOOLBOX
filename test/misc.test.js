/* misc.test.js — url-cleaner + salary-converter pure logic. */
"use strict";
const assert = require("assert");
global.window = global;
const P2 = require("../assets/js/tools-privacy2.js");
const M = require("../assets/js/tools-misc.js");
const VK = require("../data/catalog.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.strictEqual(a, b, m); pass++; };

/* url-cleaner */
let r = P2.cleanUrl("https://example.com/a?utm_source=x&id=42&fbclid=abc");
eq(r.clean, "https://example.com/a?id=42", "strips utm_source + fbclid, keeps id");
ok(r.removed.indexOf("utm_source") !== -1 && r.removed.indexOf("fbclid") !== -1, "reports removed params");
r = P2.cleanUrl("https://example.com/a?id=1");
eq(r.removed.length, 0, "clean url unchanged");
eq(r.clean, "https://example.com/a?id=1", "keeps legitimate params");
r = P2.cleanUrl("https://example.com/?utm_medium=email");
eq(r.clean, "https://example.com/", "removes lone tracker + dangling ?");
ok(P2.isTracker("utm_campaign") && P2.isTracker("gclid") && !P2.isTracker("page"), "isTracker classification");
ok(P2.cleanUrl("not a url at all !!").error || P2.cleanUrl("not a url").clean, "bad input handled, no throw");

/* salary-converter: $30/hr, 40h/wk, 52wk -> 62,400/yr */
let s = M.salaryConvert(30, "hour", 40, 52);
eq(Math.round(s.year), 62400, "30/hr -> 62,400/yr");
eq(Math.round(s.week), 1200, "-> 1,200/wk");
eq(Math.round(s.month), 5200, "-> 5,200/mo");
/* 60,000/yr -> hourly at 37.5h/wk, 52wk = 60000/1950 = 30.77 */
s = M.salaryConvert(60000, "year", 37.5, 52);
ok(Math.abs(s.hour - 30.77) < 0.05, "60k/yr @37.5h -> ~30.77/hr, got " + s.hour);
/* day rate 240/day, 5-day week, 52wk -> 62,400/yr */
s = M.salaryConvert(240, "day", 40, 52);
eq(Math.round(s.year), 62400, "240/day -> 62,400/yr (5-day week)");

["url-cleaner","metadata-remover","screenshot-redactor","salary-converter","typing-test","brb-overlay"].forEach(id => { const t = VK.find(id); ok(t && t.status === "live", id + " live"); });
console.log(`misc: ${pass} assertions passed`);
