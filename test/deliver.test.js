/* deliver.test.js — the policy that decides whether a finished result reaches
 * the user, and the gate's handling of Supabase's signup responses.
 *
 * This is the highest-stakes logic on the site. Every other bug costs a
 * conversion; a bug here costs the user the thing they came for, after they
 * already did the work. So the assertions below are weighted toward one
 * question: can this ever withhold a file it should have handed over?
 *
 * The specific trap it guards is the release condition on signup. Supabase has
 * email confirmation ON for this project — established from the data, not
 * assumed: two of three existing users show 44s and 102s between created_at and
 * email_confirmed_at, which is a human clicking a link in an email. That means
 * signUp() resolves with a user and NO session. Anything that waits for a
 * session before releasing the download sends every email signup to a dead end
 * with their work stranded on a page they have now navigated away from.
 */
"use strict";
const assert = require("assert");
global.window = global;
const D = require("../assets/js/deliver.js");
const G = require("../assets/js/gate.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.strictEqual(a, b, m); pass++; };

/* A free, signed-out visitor with the gate on — the case the whole strategy
   exists for. */
const anon = { signedIn: false, pro: false, gateEnabled: true,
               limitEnabled: true, limitHard: true, limitCount: 5, runsToday: 0 };
const of = (over) => Object.assign({}, anon, over);

/* --- the gate does its job --------------------------------------------- */
eq(D.decide(anon), "gate", "an anonymous visitor is asked to sign up");
eq(D.decide(of({ runsToday: 2 })), "gate", "still asked after a couple of runs");

/* --- signing in gets you the file -------------------------------------- */
eq(D.decide(of({ signedIn: true })), "allow", "a signed-in user downloads");
eq(D.decide(of({ signedIn: true, runsToday: 4 })), "allow", "and again, under the limit");

/* --- PAYING USERS ARE NEVER INTERRUPTED --------------------------------- */
/* If any of these ever return anything but "allow", somebody who has paid is
   being shown a sales pitch, which is the fastest way to produce a refund. */
[
  { pro: true },
  { pro: true, signedIn: false },                        // session lost mid-visit
  { pro: true, runsToday: 9999 },                        // far past the free cap
  { pro: true, signedIn: true, runsToday: 9999, limitHard: true },
  { pro: true, gateEnabled: true, limitEnabled: true, limitHard: true }
].forEach((over, i) =>
  eq(D.decide(of(over)), "allow", "a Pro user is never stopped (case " + (i + 1) + ")"));

/* --- the limit only applies to people who have an account --------------- */
/* Telling a stranger they have used up "their" free allowance is incoherent —
   they have no account for the allowance to attach to, and the first thing the
   site would ever say to them is a demand for money. */
eq(D.decide(of({ runsToday: 99 })), "gate",
   "an anonymous user over the cap is asked to sign up, NOT to pay");
eq(D.decide(of({ signedIn: true, runsToday: 5 })), "limit",
   "a signed-in free user at the cap sees the limit");
eq(D.decide(of({ signedIn: true, runsToday: 6 })), "limit", "and past it");
eq(D.decide(of({ signedIn: true, runsToday: 4 })), "allow", "but not one run below it");

/* --- switches actually switch things off -------------------------------- */
eq(D.decide(of({ gateEnabled: false })), "allow", "gate off means anonymous downloads work");
eq(D.decide(of({ signedIn: true, runsToday: 99, limitHard: false })), "allow",
   "a soft limit nudges but never withholds");
eq(D.decide(of({ signedIn: true, runsToday: 99, limitEnabled: false })), "allow",
   "limit disabled means no ceiling");
eq(D.decide(of({ gateEnabled: false, limitEnabled: false })), "allow", "both off, everything flows");

/* --- garbage in must not withhold a file -------------------------------- */
/* Every one of these is a bug somewhere upstream. None of them is a reason to
   refuse a user the file they already waited for. */
eq(D.decide({}), "allow", "an empty state allows");
eq(D.decide(null), "allow", "a null state allows");
eq(D.decide(undefined), "allow", "an undefined state allows");
eq(D.decide({ gateEnabled: true, signedIn: true }), "allow", "partial state allows");
eq(D.decide(of({ signedIn: true, limitCount: 0, runsToday: 0, limitHard: true })), "limit",
   "a zero limit is a real limit, not a missing one");

/* --- gate copy adapts, and never promises what we do not do ------------- */
const c1 = D.gateCopy(0), c4 = D.gateCopy(4);
ok(/ready/i.test(c1.title), "the title leads with the result, not the ask");
eq(c1.title, c4.title, "the headline is the same either way — it is the truth, not a pitch");
ok(c4.body.includes("4"), "a returning user is told what they have already got out of it");
[c1, c4].forEach((c) => {
  const blob = (c.title + " " + c.body).toLowerCase();
  ok(!/(store|save|upload|keep|back ?up|sync).{0,12}(your )?(file|document|photo|video)/.test(blob),
     "gate copy never implies we keep the user's files: " + c.body);
  ok(!/\bpro\b|\bupgrade\b|\bpay\b|\$/.test(blob),
     "the gate asks for an account, never for money: " + c.body);
});

/* --- THE RELEASE CONDITION ---------------------------------------------- */
/* Supabase returns { user, session:null } when confirmation is pending. If this
   ever demands a session, every email signup strands the user's work. */
ok(G.unlockedBySignup({ data: { user: { id: "u1" }, session: null }, error: null }),
   "an account pending email confirmation STILL releases the download");
ok(G.unlockedBySignup({ data: { user: { id: "u1" }, session: { access_token: "t" } }, error: null }),
   "an account with a live session releases it");
ok(!G.unlockedBySignup({ data: {}, error: { message: "User already registered" } }),
   "a failed signup does not release it");
ok(!G.unlockedBySignup(null), "a missing response does not release it");
ok(!G.unlockedBySignup({ data: {}, error: null }), "no user and no session does not release it");

ok(G.needsConfirmation({ data: { user: { id: "u1" }, session: null } }),
   "user without session means an email is waiting");
ok(!G.needsConfirmation({ data: { user: { id: "u1" }, session: { access_token: "t" } } }),
   "user with session needs no confirmation");

/* --- auth errors are actionable and leak nothing ------------------------ */
const dup = G.authMessage({ message: "User already registered" });
ok(!dup.ok && dup.signin, "an existing account flips the form to sign-in rather than scolding");
ok(/sign in/i.test(dup.text), "and says so");
eq(G.authMessage(null).ok, true, "no error is success");
[
  { message: "Invalid login credentials" },
  { message: "Password should be at least 6 characters" },
  { message: "Email rate limit exceeded" },
  { message: "Unable to validate email address: invalid format" },
  { message: "AuthApiError: request to https://qfqdmzwmjxdiqzeybaoo.supabase.co/auth/v1/signup failed" }
].forEach((e) => {
  const t = G.authMessage(e).text;
  ok(t.length > 0, "every auth error produces a message");
  ok(!/supabase|https?:|auth_|jwt|token|AuthApiError|\bsql\b/i.test(t),
     "and names no internals: " + t);
});

/* --- a parked download expires ------------------------------------------ */
/* Restoring a file the user asked for last week and silently downloading it is
   alarming, not helpful. */
const NOW = Date.UTC(2026, 7, 6, 12, 0, 0);
ok(G.pendingIsFresh({ at: NOW - 1000 }, NOW), "a file parked a second ago is delivered");
ok(G.pendingIsFresh({ at: NOW - 9 * 60000 }, NOW), "nine minutes is still within the round trip");
ok(!G.pendingIsFresh({ at: NOW - 11 * 60000 }, NOW), "eleven minutes is stale");
ok(!G.pendingIsFresh({ at: NOW - 86400000 }, NOW), "yesterday is certainly stale");
ok(!G.pendingIsFresh({ at: NOW + 60000 }, NOW), "a future timestamp is a broken clock, not freshness");
ok(!G.pendingIsFresh(null, NOW), "no record, nothing to deliver");
ok(!G.pendingIsFresh({}, NOW), "a record with no timestamp is not trusted");

console.log(`deliver + gate: ${pass} assertions passed`);

/* ---------------------------------------------------------------------------
 * THE CHAIN IS ONLY OFFERED WHEN THE FILE ACTUALLY ARRIVED.
 *
 * "Keep going with this file" under a download that the gate or the daily
 * limit withheld would be offering to continue with something the user has not
 * been given. deliver() calls offerChain() from exactly two places, both of
 * them after handover() returned true; this pins that down against the source
 * so a future edit cannot quietly add a third.
 * ------------------------------------------------------------------------- */
{
  const fsC = require("fs"), pathC = require("path");
  const src = fsC.readFileSync(pathC.join(__dirname, "..", "assets/js/deliver.js"), "utf8");

  const calls = (src.match(/offerChain\(/g) || []).length;
  ok(calls === 3, "offerChain is defined once and called twice, found " + calls + " mentions");

  /* The gate path: the call must sit AFTER the handover guard that returns
     false, so a failed handover can never reach it. */
  const gateBlock = src.slice(src.indexOf("onUnlocked:"), src.indexOf("return false;\n    }"));
  ok(/if \(!handover\(blob, name\)\) return false;/.test(gateBlock),
     "the gate path still bails when handover fails");
  ok(gateBlock.indexOf("offerChain(") > gateBlock.indexOf("if (!handover(blob, name)) return false;"),
     "and only offers the chain after that guard");

  /* Neither withheld path may mention it at all. */
  const limitBlock = src.slice(src.indexOf("if (verdict === 'limit')"), src.indexOf("handover(blob, name);\n    try"));
  ok(!/offerChain/.test(limitBlock), "the daily-limit path never offers a chain");

  /* And it must be impossible for a missing module to break a download. */
  ok(/function offerChain[\s\S]{0,400}try \{[\s\S]{0,200}catch \(e\) \{\}/.test(src),
     "offerChain swallows everything — a broken suggestion must not cost a file");
}
console.log(`deliver + chain: ${pass} total assertions passed`);
