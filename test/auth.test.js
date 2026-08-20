/* auth.test.js — auth helpers + header state + form wiring (mock Supabase). */
"use strict";
const assert = require("assert");
let JSDOM, hasDom = false;
try { JSDOM = require("jsdom").JSDOM; hasDom = true; } catch (e) {}
global.window = global;
const A = require("../assets/js/auth.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.strictEqual(a, b, m); pass++; };

/* pure helpers */
eq(A.upPrefix("/auth/sign-in/"), "../../", "auth depth -> ../../");
eq(A.upPrefix("/account/"), "../", "account depth -> ../");
ok(A.validateEmail("a@b.co") && !A.validateEmail("nope") && !A.validateEmail("a@b"), "email validation");
ok(A.passwordProblem("short") && A.passwordProblem("allletters") && !A.passwordProblem("gooddpass1"), "password rules");
eq(A.passwordProblem("abcd1234"), null, "8+ with letter+number passes");
eq(A.safeReturnUrl("/tools/pdf/merge-pdf/?x=1"), "/tools/pdf/merge-pdf/?x=1", "internal return URL passes");
eq(A.safeReturnUrl("https://evil.test/phish"), null, "external return URL blocked");
eq(A.safeReturnUrl("//evil.test/phish"), null, "protocol-relative return URL blocked");
eq(A.safeReturnUrl("/auth/callback/"), null, "callback return URL blocked");
eq(A.authMessage({ message: "Invalid login credentials" }).text, "Email or password is incorrect.", "raw signin error translated");
eq(A.authMessage({ message: "User already registered" }).signin, true, "existing account error suggests sign-in");
ok(typeof A.waitForSession === "function", "bounded session restoration helper is exposed");

/* DOM: header state via a mock supabase client (no network) */
async function domTests() {
  function setup(userObj) {
    const dom = new JSDOM('<!doctype html><header class="hdr"><div class="hdr-act"></div></header>', { url: "https://www.vootkit.com/tools/pdf/merge-pdf/" });
    const w = dom.window;
    w.VK_SUPABASE = { url: "https://x.supabase.co", anonKey: "anon_test_key" };
    w.supabase = { createClient: function () { return { auth: {
      getUser: async function () { return { data: { user: userObj } }; },
      onAuthStateChange: function () { return { data: { subscription: {} } }; }
    } }; } };
    global.document = w.document; global.window = w;
    delete require.cache[require.resolve("../assets/js/auth.js")];
    return { w, Auth: require("../assets/js/auth.js") };
  }

  // signed out -> "Sign in" link to the auth page
  let s = setup(null);
  eq(s.Auth.enabled, true, "enabled when url+anonKey present");
  await s.Auth.renderHeader();
  let slot = s.w.document.getElementById("vk-auth-slot");
  ok(slot && /Sign in/.test(slot.textContent), "signed-out header shows Sign in");
  ok(/auth\/sign-in\//.test(slot.querySelector("a").getAttribute("href")), "links to sign-in at correct depth");

  // signed in -> avatar linking to /account/
  s = setup({ email: "a@b.co", user_metadata: { display_name: "Ada" } });
  await s.Auth.renderHeader();
  slot = s.w.document.getElementById("vk-auth-slot");
  ok(slot && /account\//.test(slot.querySelector("a").getAttribute("href")), "signed-in header shows account link");
  eq(slot.querySelector(".vk-avatar").textContent, "A", "avatar shows initial");

  // disabled (no key) -> no header slot injected
  const dom2 = new JSDOM('<!doctype html><header class="hdr"><div class="hdr-act"></div></header>', { url: "https://www.vootkit.com/" });
  dom2.window.VK_SUPABASE = { url: "https://x.supabase.co", anonKey: "" };
  global.document = dom2.window.document; global.window = dom2.window;
  delete require.cache[require.resolve("../assets/js/auth.js")];
  const A3 = require("../assets/js/auth.js");
  eq(A3.enabled, false, "disabled when anon key empty");
  await A3.renderHeader();
  ok(!dom2.window.document.getElementById("vk-auth-slot"), "no header UI when auth disabled (clean)");

  console.log(`auth: ${pass} assertions passed (incl. DOM)`);
}

if (hasDom) { domTests().catch(function (e) { console.error(e); process.exit(1); }); }
else { console.log(`auth: ${pass} assertions passed (DOM skipped)`); }
