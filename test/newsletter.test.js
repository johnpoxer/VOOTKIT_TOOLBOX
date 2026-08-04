/* newsletter.test.js — email capture.
 *
 * Two failure modes matter more than the rest, and both are silent:
 *
 *  1. Rejecting a valid address. The visitor sees "that email does not look
 *     right" about an address they use every day, assumes the site is broken,
 *     and never tries again. Over-strict validation is the classic cause, so
 *     the accept list below is deliberately awkward — plus-addressing, long
 *     TLDs, subdomains, uppercase.
 *
 *  2. Telling an existing subscriber their signup failed. They submit again,
 *     fail again, and conclude the list is broken. A duplicate is a success.
 *
 * The unsubscribe token check is here for a different reason: it is the only
 * value on the site that goes from a URL into a database call, so it is
 * validated to a UUID shape before it can travel.
 */
"use strict";
const assert = require("assert");
global.window = global;
const N = require("../assets/js/newsletter.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); pass++; };

/* --- addresses that MUST be accepted ------------------------------------- */
[
  "a@b.co",
  "john.prosper@vootkit.com",
  "john+newsletter@gmail.com",              // plus-addressing is not a typo
  "someone@mail.long-subdomain.example.io", // subdomains and hyphens
  "user@example.photography",               // long TLDs are real
  "JOHN@VOOTKIT.COM",                       // case is not a defect
  "o'brien@example.ie",                     // apostrophes exist in real names
  "user_name-123@sub.example.co.uk"
].forEach((e) => ok(N.validEmail(e), "accepts " + e));

/* --- addresses that must be rejected -------------------------------------- */
[
  "", " ", "nope", "no-at-sign.com",
  "@example.com",                 // nothing before the @
  "user@",                        // nothing after it
  "user@nodot",                   // a domain with no dot cannot resolve
  "a@b.c d",                      // whitespace: almost always a paste error
  "two@at@example.com",
  "user@.example.com",            // leading dot
  "user@example.com.",            // trailing dot
  "user@exa..mple.com",           // doubled dot
  "user@-example.com",
  "x@y.z",                        // under the 6-char floor
  "a".repeat(250) + "@b.com"      // over the 254 RFC ceiling
].forEach((e) => ok(!N.validEmail(e), "rejects " + JSON.stringify(e)));

ok(!N.validEmail(null) && !N.validEmail(undefined) && !N.validEmail(42), "non-strings never pass");

/* --- a duplicate is a success, not an error ------------------------------- */
/* This is the assertion that protects the returning subscriber. If it ever
   flips to ok:false, someone already on the list is told their signup failed. */
ok(N.messageFor({ code: "23505", message: "duplicate key value" }).ok,
   "postgres 23505 is reported as success");
ok(N.messageFor({ message: 'duplicate key value violates unique constraint "subscribers_email_lower_key"' }).ok,
   "duplicate detected by message when no code is present");
ok(/already subscribed/i.test(N.messageFor({ code: "23505" }).text),
   "the duplicate message says they are already on the list");

/* --- no error means success ----------------------------------------------- */
ok(N.messageFor(null).ok, "no error is a success");
ok(N.messageFor(undefined).ok, "undefined error is a success");

/* --- real failures stay failures ------------------------------------------ */
ok(!N.messageFor({ code: "42501", message: "new row violates row-level security policy" }).ok,
   "an RLS refusal is a failure");
ok(!N.messageFor({ code: "42P01", message: 'relation "public.subscribers" does not exist' }).ok,
   "a missing table is a failure");
ok(!N.messageFor({ message: "network error" }).ok, "a network error is a failure");

/* No failure message may blame the visitor for something they cannot fix, and
   none may leak the shape of the database to a stranger. */
[
  { code: "42P01", message: 'relation "public.subscribers" does not exist' },
  { code: "42501", message: "new row violates row-level security policy for table subscribers" }
].forEach((e) => {
  const t = N.messageFor(e).text;
  ok(!/relation|row-level|policy|subscribers|SQL|postgres/i.test(t),
     "failure text hides internals: " + t);
});

/* --- never ask someone who already said yes -------------------------------- */
ok(N.shouldOffer({ subscribed: false }), "offered to a stranger");
ok(!N.shouldOffer({ subscribed: true }), "never offered to an existing subscriber");
ok(N.shouldOffer({}), "offered when state is unknown");

/* --- the unsubscribe token ------------------------------------------------- */
/* Anything that is not a UUID is refused before it reaches the database. */
eq(N.readToken("?t=6f9619ff-8b86-d011-b42d-00c04fc964ff"), "6f9619ff-8b86-d011-b42d-00c04fc964ff",
   "reads a valid token");
eq(N.readToken("?utm_source=email&t=6F9619FF-8B86-D011-B42D-00C04FC964FF&x=1"),
   "6F9619FF-8B86-D011-B42D-00C04FC964FF", "finds the token among other params");
[
  "", "?", "?t=", "?t=abc", "?token=6f9619ff-8b86-d011-b42d-00c04fc964ff",
  "?t=6f9619ff-8b86-d011-b42d-00c04fc964ff'--",
  "?t=' or 1=1--",
  "?t=" + encodeURIComponent("6f9619ff-8b86-d011-b42d-00c04fc964ff; drop table subscribers"),
  "?t=../../etc/passwd",
  "?t=<script>"
].forEach((q) => eq(N.readToken(q), "", "refuses " + JSON.stringify(q)));

/* An unsubscribe with no token must not call the database at all. */
N.unsubscribe("").then((r) => {
  ok(!r.ok, "an empty token is refused");
  ok(/link/i.test(r.text), "and says the link is the problem, not the person");

  /* --- the copy may never promise file storage --------------------------- */
  /* Every tool page carries a "runs on your device" badge. A signup form on the
     same page implying we keep files contradicts it, and the contradiction is
     what costs trust. This asserts the promise against the rendered form. */
  const doc = fakeDoc();
  global.document = doc;
  delete require.cache[require.resolve("../assets/js/newsletter.js")];
  const N2 = require("../assets/js/newsletter.js");
  const form = N2.build("footer", false);
  const html = form.innerHTML;
  /* Guard against vacuous passes: every "must NOT contain" assertion below
     would also pass on an empty string, which is exactly what a broken fake DOM
     produces. Prove there is a form here before asserting things about it. */
  ok(html.length > 400 && /<input/.test(html) && /type="submit"/.test(html),
     "the fake DOM actually rendered a form (" + html.length + " chars)");
  ok(!/save your files|store your files|upload|backup|sync|cloud/i.test(html),
     "the form never implies we keep the user's files");
  ok(/unsubscribe|leave/i.test(html), "the form states you can leave");

  /* Consent must be present, unticked, and required. Pre-ticked consent is
     invalid under GDPR and is how a list becomes unmailable. */
  const check = form.querySelector(".nl-check");
  ok(check, "a consent checkbox exists");
  ok(check.getAttribute("type") === "checkbox", "it is a checkbox");
  ok(!/checked/i.test(html), "consent is NOT pre-ticked");
  ok(/required/.test(html), "consent is required");

  /* The input must be labelled: a placeholder is a hint, not a label. */
  ok(/<label class="nl-lab" for="nl-e-footer"/.test(html) && /id="nl-e-footer"/.test(html),
     "the email input has a real, matching label");
  ok(/aria-live="polite"/.test(html), "status messages are announced to screen readers");

  /* The compact variant drops the heading but keeps consent — the ask is
     smaller, the lawful basis is not. */
  const compact = N2.build("tool_success", true);
  ok(!/nl-title/.test(compact.innerHTML), "compact form has no heading");
  ok(/nl-check/.test(compact.innerHTML) && /required/.test(compact.innerHTML),
     "compact form still requires consent");
  ok(/nl-compact/.test(compact.className), "compact form is marked for CSS");

  console.log("newsletter.test.js: " + pass + " assertions passed");
}).catch((e) => { console.error(e); process.exit(1); });

/* A DOM small enough to be honest about what it does: just enough for build(). */
function fakeDoc() {
  function node(tag) {
    return {
      tagName: tag, className: "", innerHTML: "", _attrs: {}, children: [],
      setAttribute(k, v) { this._attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
      hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k); },
      addEventListener() {},
      appendChild(c) { this.children.push(c); return c; },
      querySelector(sel) {
        const cls = sel.replace(/^\./, "");
        const m = new RegExp('class="[^"]*\\b' + cls + '\\b[^"]*"[^>]*type="([a-z]+)"').exec(this.innerHTML)
               || new RegExp('type="([a-z]+)"[^>]*class="[^"]*\\b' + cls + '\\b').exec(this.innerHTML);
        if (!new RegExp('\\b' + cls + '\\b').test(this.innerHTML)) return null;
        return { getAttribute: (k) => (k === "type" && m ? m[1] : null), focus() {}, value: "", disabled: false, checked: false };
      }
    };
  }
  return { createElement: node, querySelectorAll: () => [], querySelector: () => null, readyState: "complete", addEventListener() {} };
}
