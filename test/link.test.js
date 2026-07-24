/* link.test.js — pure helpers for the URL shortener function.
 * The network path needs Supabase + Netlify; these validate the logic that
 * must be provably correct (URL validation, alias sanitising, code generation). */
"use strict";
const assert = require("assert");
const { _helpers } = require("../netlify/functions/create-link.js");
const H = _helpers;
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };

/* URL validation: only real http(s) URLs with a dotted host */
ok(H.validUrl("https://example.com/x?y=1"), "https URL valid");
ok(H.validUrl("http://a.co"), "http URL valid");
ok(!H.validUrl("ftp://example.com"), "ftp rejected");
ok(!H.validUrl("javascript:alert(1)"), "javascript: scheme rejected");
ok(!H.validUrl("notaurl"), "no-scheme string rejected");
ok(!H.validUrl("https://localhost"), "host without a dot rejected");
ok(!H.validUrl(""), "empty rejected");
ok(!H.validUrl("https://" + "a".repeat(3000) + ".com"), "over-long URL rejected");

/* alias sanitising: lowercase, spaces/underscores -> hyphen, strip junk, cap 32 */
ok(H.cleanAlias("My Link!!") === "my-link", "alias 'My Link!!' -> my-link, got " + H.cleanAlias("My Link!!"));
ok(H.cleanAlias("  __Weird__Name  ") === "weird-name", "alias trims + collapses, got " + H.cleanAlias("  __Weird__Name  "));
ok(H.cleanAlias("a".repeat(50)).length === 32, "alias capped at 32");
ok(H.cleanAlias("café☕") === "caf", "alias strips non-ascii, got " + H.cleanAlias("café☕"));

/* code generation: length + no ambiguous characters */
const code = H.genCode(6);
ok(/^[a-zA-Z0-9]{6}$/.test(code), "code is 6 alphanumerics: " + code);
ok(!/[0O1lI]/.test(H.genCode(20)), "code avoids ambiguous chars");

/* reserved words protected */
ok(H.RESERVED.indexOf("admin") !== -1 && H.RESERVED.indexOf("s") !== -1, "reserved list guards key paths");

console.log(`link: ${pass} assertions passed`);
