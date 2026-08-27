/* auth.test.js — auth helpers + header state + form wiring (mock Supabase). */
"use strict";
const assert = require("assert");
const fs = require("fs");
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
ok(typeof A.restoreUser === "function", "cross-page user restoration helper is exposed");

/* Storage regression: a broken local token must recover from the healthy
   same-tab copy, then repair localStorage for the following navigation. */
function memoryStore(seed) {
  const values = Object.assign({}, seed || {});
  return { getItem: k => Object.prototype.hasOwnProperty.call(values, k) ? values[k] : null,
    setItem: (k, v) => { values[k] = String(v); }, removeItem: k => { delete values[k]; } };
}
const goodSession = JSON.stringify({ access_token: "token", user: { id: "u1" } });
global.localStorage = memoryStore({ [A.storageKey]: "{broken" });
global.sessionStorage = memoryStore({ [A.storageKey]: goodSession });
const mirrored = A.storage();
eq(mirrored.getItem(A.storageKey), goodSession, "healthy tab session wins over corrupt local token");
eq(global.localStorage.getItem(A.storageKey), goodSession, "recovered session repairs persistent storage");
mirrored.removeItem(A.storageKey);
eq(global.localStorage.getItem(A.storageKey), null, "sign-out clears persistent auth storage");
eq(global.sessionStorage.getItem(A.storageKey), null, "sign-out clears tab auth storage");
global.localStorage.setItem(A.storageKey, goodSession);
global.sessionStorage.setItem(A.storageKey, goodSession);
A.clearLocalAuth();
eq(global.localStorage.getItem(A.storageKey), null, "forced logout clears persistent backup immediately");
eq(global.sessionStorage.getItem(A.storageKey), null, "forced logout clears tab backup immediately");

const baseCss = fs.readFileSync(require("path").join(__dirname, "../assets/css/base.css"), "utf8");
ok(/\.vk-signed-in \.vk-auth-slot\s*\{\s*display:\s*inline-flex/.test(baseCss), "signed-in avatar remains visible on mobile");
ok(/\.vk-signed-in \.hdr-cta\s*\{\s*display:\s*none/.test(baseCss), "signup CTA is hidden after login");
const homeHtml = fs.readFileSync(require("path").join(__dirname, "../index.html"), "utf8");
ok(/class="header-actions"[^>]*>[\s\S]*?id="vk-auth-slot"/.test(homeHtml), "homepage exposes the shared auth slot");
ok(/data-auth-link/.test(homeHtml), "homepage drawer has an auth-aware account link");
ok(/data-auth-link>Log in</.test(homeHtml), "signed-out homepage menu says Log in");
ok(/documentElement\.classList\.add\('vk-signed-in'\)/.test(homeHtml), "homepage paints auth hint before CSS");
const buildSource = fs.readFileSync(require("path").join(__dirname, "../build.js"), "utf8");
ok(/function authHintHead\(\)/.test(buildSource) && /\$\{authHintHead\(\)\}/.test(buildSource), "generated pages paint auth hint before CSS");
ok(/vk-auth-slot\[aria-busy="true"\][^}]*visibility:\s*hidden/.test(baseCss), "pending session never flashes a login control");

/* DOM: header state via a mock supabase client (no network) */
async function domTests() {
  function setup(userObj) {
    const dom = new JSDOM('<!doctype html><header class="hdr"><div class="hdr-act"></div></header>', { url: "https://www.vootkit.com/tools/pdf/merge-pdf/" });
    const w = dom.window;
    w.VK_SUPABASE = { url: "https://x.supabase.co", anonKey: "anon_test_key" };
    var clientOptions = null;
    w.supabase = { createClient: function (url, key, options) { clientOptions = options; return { auth: {
      getSession: async function () { return { data: { session: userObj ? { access_token: "token", user: userObj } : null } }; },
      getUser: async function () { return { data: { user: userObj } }; },
      onAuthStateChange: function () { return { data: { subscription: {} } }; }
    } }; } };
    global.document = w.document; global.window = w;
    delete require.cache[require.resolve("../assets/js/auth.js")];
    return { w, Auth: require("../assets/js/auth.js"), options: function () { return clientOptions; } };
  }

  // signed out -> "Sign in" link to the auth page
  let s = setup(null);
  eq(s.Auth.enabled, true, "enabled when url+anonKey present");
  await s.Auth.renderHeader();
  ok(s.options().auth.persistSession, "session persistence stays enabled");
  ok(s.options().auth.storage && /sb-x-auth-token/.test(s.options().auth.storageKey), "auth uses mirrored navigation storage");
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
