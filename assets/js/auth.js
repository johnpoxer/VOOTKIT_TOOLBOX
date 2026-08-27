/* auth.js — Vootkit accounts (Supabase). Loaded site-wide.
 *
 * Client-side auth for a static site: the Supabase JS SDK is lazy-loaded from a
 * CDN and initialised with the PUBLIC url + anon key (safe to expose; row-level
 * security enforces access server-side). No secrets here.
 *
 * Degrades cleanly: if no anon key is configured yet, the account UI stays
 * hidden and the auth pages show a "launching soon" notice — nothing errors.
 *
 * Pure helpers (upPrefix, validateEmail, passwordProblem) are exported for tests.
 */
(function (root) {
  'use strict';
  var doc = typeof document !== 'undefined' ? document : null;
  var SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

  var CFG = root.VK_SUPABASE || {};
  var ENABLED = !!(CFG.url && CFG.anonKey);

  /* ---- pure helpers ---- */
  function upPrefix(pathname) {
    var segs = String(pathname || '/').replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    if (segs.length && segs[segs.length - 1].indexOf('.') !== -1) segs.pop();
    return segs.length ? new Array(segs.length + 1).join('../') : '';
  }
  function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim()); }
  function passwordProblem(pw) {
    pw = String(pw || '');
    if (pw.length < 8) return 'Use at least 8 characters.';
    if (!/[a-z]/i.test(pw) || !/[0-9]/.test(pw)) return 'Mix in at least one letter and one number.';
    return null;
  }
  function safeReturnUrl(raw) {
    if (!raw) return null;
    try {
      var base = loc().origin || 'https://www.vootkit.com';
      var u = new URL(String(raw), base);
      if (u.origin !== base) return null;
      if (!u.pathname || /^\/\//.test(u.pathname) || /\\/.test(u.pathname)) return null;
      if (/^\/auth\/callback\/?$/i.test(u.pathname)) return null;
      return u.pathname + u.search + u.hash;
    } catch (e) { return null; }
  }
  function authRedirect(path, returnTo) {
    var target = safeReturnUrl(returnTo);
    return (loc().origin || 'https://www.vootkit.com') + path + (target ? '?next=' + encodeURIComponent(target) : '');
  }
  function authMessage(error) {
    if (!error) return { ok: true, text: '' };
    var m = String(error.message || error.error_description || error.error || '').toLowerCase();
    if (/already registered|already exists|user already|duplicate/.test(m)) {
      return { ok: false, text: 'That email already has an account. Sign in instead.', signin: true };
    }
    if (/invalid login|invalid credentials|email not confirmed/.test(m)) {
      return { ok: false, text: 'Email or password is incorrect.' };
    }
    if (/popup|cancel|closed|denied|access_denied/.test(m)) {
      return { ok: false, text: 'Google sign-in was cancelled. You can try again or use email.' };
    }
    if (/password/.test(m) && /short|least|weak|length/.test(m)) {
      return { ok: false, text: 'Use at least 8 characters with a letter and a number.' };
    }
    if (/rate|too many|limit/.test(m)) {
      return { ok: false, text: 'Too many attempts. Please wait a moment and try again.' };
    }
    if (/network|failed to fetch|connection|timeout/.test(m)) {
      return { ok: false, text: "We couldn't connect. Check your connection and try again." };
    }
    if (/email|address/.test(m) && /invalid/.test(m)) {
      return { ok: false, text: 'Enter a valid email address.' };
    }
    return { ok: false, text: 'That did not work. Please try again in a moment.' };
  }

  function loc() { return root.location || { pathname: '/', href: '', origin: '' }; }
  function up() { return doc ? upPrefix(loc().pathname) : ''; }
  function pause(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  /* Keep one auth record available to every full-page navigation. Supabase's
     default browser store is localStorage only. Some iOS/WebView privacy modes
     allow the write on the login document but do not return it reliably to the
     next document. sessionStorage *does* survive navigation in the same tab,
     so mirror the exact same Supabase value into both stores and recover from
     either one. No Vootkit code reads or alters the token payload. */
  var AUTH_STORAGE_KEY = 'sb-' + (CFG.ref || String(CFG.url || '').replace(/^.*\/\//, '').split('.')[0]) + '-auth-token';
  function webStorage() {
    if (!doc) return null;
    function read(store, key) { try { return store && store.getItem(key); } catch (e) { return null; } }
    function write(store, key, value) { try { if (store) store.setItem(key, value); } catch (e) {} }
    function drop(store, key) { try { if (store) store.removeItem(key); } catch (e) {} }
    return {
      getItem: function (key) {
        var value = read(root.localStorage, key) || read(root.sessionStorage, key);
        if (value) { write(root.localStorage, key, value); write(root.sessionStorage, key, value); }
        return value;
      },
      setItem: function (key, value) {
        write(root.localStorage, key, value);
        write(root.sessionStorage, key, value);
      },
      removeItem: function (key) {
        drop(root.localStorage, key);
        drop(root.sessionStorage, key);
      }
    };
  }

  /* ---- SDK + client (lazy) ---- */
  var _client = null, _loading = null;
  function loadSdk() {
    if (root.supabase) return Promise.resolve(root.supabase);
    return new Promise(function (res, rej) {
      var s = doc.createElement('script'); s.src = SDK; s.async = true;
      s.onload = function () { root.supabase ? res(root.supabase) : rej(new Error('Auth SDK failed to load.')); };
      s.onerror = function () { rej(new Error('Could not load the auth service. Check your connection.')); };
      doc.head.appendChild(s);
    });
  }
  function client() {
    if (!ENABLED) return Promise.reject(new Error('Accounts are not configured yet.'));
    if (_client) return Promise.resolve(_client);
    if (_loading) return _loading;
    _loading = loadSdk().then(function (sb) {
      var authOptions = {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: AUTH_STORAGE_KEY
      };
      var storage = webStorage(); if (storage) authOptions.storage = storage;
      _client = sb.createClient(CFG.url, CFG.anonKey, { auth: authOptions });
      return _client;
    });
    return _loading;
  }

  /* ---- auth actions ---- */
  async function signUp(email, password, displayName, returnTo) {
    var c = await client();
    var r = await c.auth.signUp({ email: email, password: password, options: { data: { display_name: displayName || '' }, emailRedirectTo: authRedirect('/auth/callback/', returnTo) } });
    /* Only on success, and carrying NO identity — not the email, not the name,
       not the user id. The event says "an account was created"; who created it
       is Supabase's business and nobody else's. */
    try { if (!r.error && root.VKTrack) root.VKTrack.signUp('password'); } catch (e) {}
    return r;
  }
  async function signIn(email, password) { var c = await client(); return c.auth.signInWithPassword({ email: email, password: password }); }
  async function signInOAuth(provider, returnTo) { var c = await client(); return c.auth.signInWithOAuth({ provider: provider, options: { redirectTo: authRedirect('/auth/callback/', returnTo) } }); }
  async function sendReset(email, returnTo) { var c = await client(); return c.auth.resetPasswordForEmail(email, { redirectTo: authRedirect('/auth/update-password/', returnTo) }); }
  async function updatePassword(newPassword) { var c = await client(); return c.auth.updateUser({ password: newPassword }); }
  async function signOut() { var c = await client(); await c.auth.signOut(); loc().href = up() || './'; }
  async function getUser() { if (!ENABLED) return null; var c = await client(); var r = await c.auth.getUser(); return r && r.data ? r.data.user : null; }
  async function getSession() { if (!ENABLED) return null; var c = await client(); var r = await c.auth.getSession(); return r && r.data ? r.data.session : null; }
  /* PKCE restoration happens asynchronously when the callback page creates
     the client. A direct getSession() in that window can legitimately return
     null for a moment, which previously sent a newly signed-in buyer straight
     back to Login. Keep this bounded: 1.8 seconds maximum, no infinite loop. */
  async function waitForSession(attempts) {
    attempts = Math.max(1, Math.min(Number(attempts) || 7, 12));
    for (var i = 0; i < attempts; i++) {
      var session = await getSession();
      if (session && session.access_token) return session;
      if (i < attempts - 1) await pause(150 + i * 50);
    }
    return null;
  }
  /* A new document must restore the persisted session before deciding that the
     visitor is signed out. getUser() performs a network validation and can
     briefly return no user (or throw) while an existing token is being
     refreshed. Treating that transient state as a logout made navigation to
     any other Vootkit page replace the avatar with "Sign in", and made the
     account guard bounce a valid user back to the login page. The locally
     restored session is the source of truth for page boot; Supabase/RLS still
     validates the token for every protected database request. */
  async function restoreUser(attempts) {
    var session = await waitForSession(attempts || 8);
    if (!session || !session.user) return null;
    try {
      var user = await getUser();
      return user || session.user;
    } catch (e) {
      return session.user;
    }
  }
  async function onChange(cb) { var c = await client(); return c.auth.onAuthStateChange(function (e, session) { cb(e, session && session.user); }); }

  /* ---- header state (runs on every page) ---- */
  function paintSlot(slot, user) {
    var u = up();
    if (user) {
      var name = (user.user_metadata && user.user_metadata.display_name) || user.email || 'Account';
      var initial = (name[0] || 'A').toUpperCase();
      slot.innerHTML = '<a class="vk-avatar" href="' + u + 'account/" aria-label="Your account" title="' + String(name).replace(/"/g, '') + '">' + initial + '</a>';
    } else {
      slot.innerHTML = '<a class="btn btn-sm" href="' + u + 'auth/sign-in/">Sign in</a>';
    }
  }
  var _subscribed = false;
  async function renderHeader() {
    if (!ENABLED || !doc) return;
    var act = doc.querySelector('.hdr-act'); if (!act) return;
    // reuse the slot if it already exists — never remove/recreate (that caused flicker)
    var slot = doc.getElementById('vk-auth-slot');
    if (!slot) { slot = doc.createElement('span'); slot.id = 'vk-auth-slot'; slot.className = 'vk-auth-slot'; act.insertBefore(slot, act.firstChild); }
    var user = null; try { user = await restoreUser(8); } catch (e) {}
    paintSlot(slot, user);
    // subscribe to auth changes EXACTLY ONCE; the handler only repaints (no re-render, no re-subscribe)
    if (!_subscribed) {
      _subscribed = true;
      onChange(function (e, u2) { var s = doc.getElementById('vk-auth-slot'); if (s) paintSlot(s, u2); }).catch(function () {});
    }
  }

  /* ---- guard: redirect to sign-in if not authed (for /account/) ---- */
  async function requireAuth() {
    if (!ENABLED) return null;
    var user = await restoreUser(10);
    if (!user) { loc().href = up() + 'auth/sign-in/?next=' + encodeURIComponent(loc().pathname); return null; }
    return user;
  }

  /* ---- tool-page favorite toggle + history logging ---- */
  async function favInit() {
    if (!ENABLED || !doc) return;
    var ws = doc.getElementById('workspace'); if (!ws) return;
    var toolId = ws.getAttribute('data-tool'); if (!toolId) return;
    var user; try { user = await restoreUser(8); } catch (e) { return; }
    if (!user) return;
    var c = await client();
    // log usage (upsert keeps one row per tool, freshest first)
    try { c.from('history').upsert({ user_id: user.id, tool_id: toolId, used_at: new Date().toISOString() }, { onConflict: 'user_id,tool_id' }); } catch (e) {}
    // favorite button
    var head = doc.querySelector('.tool-head .trust') || doc.querySelector('.tool-head');
    if (!head) return;
    var fav = false;
    try { var r = await c.from('favorites').select('tool_id').eq('user_id', user.id).eq('tool_id', toolId).maybeSingle(); fav = !!(r && r.data); } catch (e) {}
    var btn = doc.createElement('button');
    btn.type = 'button'; btn.className = 'vk-fav' + (fav ? ' is-on' : '');
    btn.setAttribute('aria-pressed', fav ? 'true' : 'false');
    function paint() { btn.innerHTML = (fav ? '★' : '☆') + ' <span>' + (fav ? 'Saved' : 'Save') + '</span>'; btn.setAttribute('aria-label', fav ? 'Remove from favorites' : 'Save to favorites'); btn.classList.toggle('is-on', fav); btn.setAttribute('aria-pressed', fav ? 'true' : 'false'); }
    paint();
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      try {
        if (fav) { await c.from('favorites').delete().eq('user_id', user.id).eq('tool_id', toolId); fav = false; }
        else { await c.from('favorites').insert({ user_id: user.id, tool_id: toolId }); fav = true; }
        paint(); if (root.VKUI) root.VKUI.toast(fav ? 'Saved to your account' : 'Removed', { type: 'ok' });
      } catch (e) { if (root.VKUI) root.VKUI.toast('Could not update favorites', { type: 'warn' }); }
      btn.disabled = false;
    });
    head.appendChild(btn);
  }

  var VKAuth = {
    enabled: ENABLED, upPrefix: upPrefix, validateEmail: validateEmail, passwordProblem: passwordProblem,
    safeReturnUrl: safeReturnUrl, authMessage: authMessage,
    favInit: favInit,
    client: client, signUp: signUp, signIn: signIn, signInOAuth: signInOAuth, sendReset: sendReset,
    updatePassword: updatePassword, signOut: signOut, getUser: getUser, getSession: getSession, waitForSession: waitForSession, restoreUser: restoreUser, onChange: onChange,
    renderHeader: renderHeader, requireAuth: requireAuth, config: CFG
  };
  root.VKAuth = VKAuth;
  if (typeof module === 'object' && module.exports) module.exports = VKAuth;

  if (doc) {
    function boot() { renderHeader(); favInit(); }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
