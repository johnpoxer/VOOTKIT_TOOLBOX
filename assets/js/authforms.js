/* authforms.js — wires the sign-in / sign-up / reset / update-password / callback
 * forms to VKAuth. One file, detects which page it's on. Runs only on /auth/*. */
(function (root) {
  'use strict';
  var doc = document, A = root.VKAuth;
  var page = doc.querySelector('[data-auth]'); if (!page) return;
  var kind = page.getAttribute('data-auth');

  function $(s) { return page.querySelector(s); }
  function msg(text, isErr) { var m = $('.auth-msg'); if (!m) return; m.textContent = text; m.className = 'auth-msg note' + (isErr ? ' err' : ''); m.hidden = false; }
  function busy(btn, on, label) { if (!btn) return; btn.disabled = on; if (on) { btn.dataset.l = btn.textContent; btn.textContent = label || 'Working…'; } else if (btn.dataset.l) btn.textContent = btn.dataset.l; }
  function nextUrl() { try { return new URLSearchParams(location.search).get('next'); } catch (e) { return null; } }
  function go(path) { location.href = (A ? A.upPrefix(location.pathname) : '../../') + path; }

  if (!A || !A.enabled) {
    var form = $('form'); if (form) form.hidden = true;
    msg('Accounts are launching soon. Every tool works without an account in the meantime.', false);
    return;
  }

  // OAuth buttons (work once the provider is enabled in Supabase)
  page.querySelectorAll('[data-oauth]').forEach(function (b) {
    b.addEventListener('click', async function () { try { await A.signInOAuth(b.getAttribute('data-oauth')); } catch (e) { msg(e.message, true); } });
  });

  if (kind === 'signin') {
    $('form').addEventListener('submit', async function (e) {
      e.preventDefault(); var email = $('#email').value.trim(), pw = $('#password').value, btn = $('button[type=submit]');
      if (!A.validateEmail(email)) return msg('Enter a valid email.', true);
      busy(btn, true, 'Signing in…');
      try { var r = await A.signIn(email, pw); if (r.error) throw r.error; location.href = nextUrl() || ((A.upPrefix(location.pathname)) + 'account/'); }
      catch (err) { busy(btn, false); msg(err.message || 'Could not sign in.', true); }
    });
  }

  if (kind === 'signup') {
    $('form').addEventListener('submit', async function (e) {
      e.preventDefault(); var name = $('#name').value.trim(), email = $('#email').value.trim(), pw = $('#password').value, btn = $('button[type=submit]');
      if (!A.validateEmail(email)) return msg('Enter a valid email.', true);
      var pp = A.passwordProblem(pw); if (pp) return msg(pp, true);
      busy(btn, true, 'Creating account…');
      try { var r = await A.signUp(email, pw, name); if (r.error) throw r.error;
        $('form').hidden = true; msg('Check your inbox — we sent a link to ' + email + ' to confirm your account.', false); }
      catch (err) { busy(btn, false); msg(err.message || 'Could not sign up.', true); }
    });
  }

  if (kind === 'reset') {
    $('form').addEventListener('submit', async function (e) {
      e.preventDefault(); var email = $('#email').value.trim(), btn = $('button[type=submit]');
      if (!A.validateEmail(email)) return msg('Enter a valid email.', true);
      busy(btn, true, 'Sending…');
      try { var r = await A.sendReset(email); if (r.error) throw r.error;
        $('form').hidden = true; msg('If an account exists for ' + email + ', a reset link is on its way.', false); }
      catch (err) { busy(btn, false); msg(err.message || 'Could not send reset email.', true); }
    });
  }

  if (kind === 'update') {
    // arrives via the recovery link; detectSessionInUrl establishes the session
    $('form').addEventListener('submit', async function (e) {
      e.preventDefault(); var pw = $('#password').value, btn = $('button[type=submit]');
      var pp = A.passwordProblem(pw); if (pp) return msg(pp, true);
      busy(btn, true, 'Saving…');
      try { var r = await A.updatePassword(pw); if (r.error) throw r.error;
        msg('Password updated. Redirecting…', false); setTimeout(function () { go('account/'); }, 900); }
      catch (err) { busy(btn, false); msg(err.message || 'The reset link may have expired — request a new one.', true); }
    });
  }

  if (kind === 'callback') {
    // confirm email / OAuth return — establish session then move on
    (async function () {
      try { await A.client(); var user = await A.getUser(); go(user ? 'account/' : 'auth/sign-in/'); }
      catch (e) { msg('Could not complete sign-in. Try again.', true); }
    })();
  }
})(typeof window !== 'undefined' ? window : globalThis);
