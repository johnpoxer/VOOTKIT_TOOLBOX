/* authforms.js - wires the sign-in / sign-up / reset / update-password /
 * callback pages to VKAuth. Runs only on /auth/*. */
(function (root) {
  'use strict';

  var doc = document;
  var A = root.VKAuth;
  var page = doc.querySelector('[data-auth]');
  if (!page) return;
  var kind = page.getAttribute('data-auth');

  function $(s) { return page.querySelector(s); }
  function msg(text, isErr) {
    var m = $('.auth-msg');
    if (!m) return;
    m.textContent = text;
    m.className = 'auth-msg note' + (isErr ? ' err' : '');
    m.hidden = false;
  }
  function friendly(error) {
    return A && A.authMessage
      ? A.authMessage(error).text
      : ((error && error.message) || 'That did not work. Please try again.');
  }
  function busy(btn, on, label) {
    if (!btn) return;
    btn.disabled = on;
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    if (on) {
      btn.dataset.l = btn.textContent;
      btn.textContent = label || 'Working...';
    } else if (btn.dataset.l) {
      btn.textContent = btn.dataset.l;
    }
  }
  function nextUrl() {
    try {
      var raw = new URLSearchParams(location.search).get('next');
      return A && A.safeReturnUrl ? A.safeReturnUrl(raw) : raw;
    } catch (e) { return null; }
  }
  function go(path) {
    location.href = (A ? A.upPrefix(location.pathname) : '../../') + path;
  }
  function showSuccess(name) {
    var form = $('form');
    var success = page.querySelector('[data-success="' + name + '"]');
    if (form) form.hidden = true;
    if (success) success.hidden = false;
  }
  function updateRules(pw) {
    var value = String(pw || '');
    [
      ['length', value.length >= 8],
      ['number', /[0-9]/.test(value)],
      ['letter', /[a-z]/i.test(value)]
    ].forEach(function (rule) {
      var el = page.querySelector('[data-pass-rule="' + rule[0] + '"]');
      if (el) el.classList.toggle('is-missing', !rule[1]);
    });
  }

  page.querySelectorAll('[data-toggle-password]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wrap = btn.closest('.auth-password');
      var input = wrap && wrap.querySelector('input');
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      input.focus();
    });
  });

  var passInput = $('#password');
  if (passInput) {
    updateRules(passInput.value);
    passInput.addEventListener('input', function () { updateRules(passInput.value); });
  }

  if (!A || !A.enabled) {
    var form = $('form');
    if (form) form.hidden = true;
    msg('Accounts are launching soon. Every tool works without an account in the meantime.', false);
    return;
  }

  page.querySelectorAll('[data-oauth]').forEach(function (b) {
    b.addEventListener('click', async function () {
      busy(b, true, 'Opening Google...');
      try {
        var r = await A.signInOAuth(b.getAttribute('data-oauth'), nextUrl());
        if (r && r.error) throw r.error;
      } catch (e) {
        busy(b, false);
        msg(friendly(e), true);
      }
    });
  });

  if (kind === 'signin') {
    $('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = $('#email').value.trim();
      var pw = $('#password').value;
      var btn = $('button[type=submit]');
      if (!A.validateEmail(email)) return msg('Enter a valid email address.', true);
      busy(btn, true, 'Signing in...');
      try {
        var r = await A.signIn(email, pw);
        if (r.error) throw r.error;
        location.href = nextUrl() || (A.upPrefix(location.pathname) + 'account/');
      } catch (err) {
        busy(btn, false);
        msg(friendly(err), true);
      }
    });
  }

  if (kind === 'signup') {
    $('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = $('#name').value.trim();
      var email = $('#email').value.trim();
      var pw = $('#password').value;
      var btn = $('button[type=submit]');
      if (!A.validateEmail(email)) return msg('Enter a valid email address.', true);
      var pp = A.passwordProblem(pw);
      if (pp) return msg(pp, true);
      busy(btn, true, 'Creating account...');
      try {
        var r = await A.signUp(email, pw, name, nextUrl());
        if (r.error) throw r.error;
        showSuccess('verify');
        msg('Check your inbox to confirm your account.', false);
      } catch (err) {
        busy(btn, false);
        msg(friendly(err), true);
      }
    });
  }

  if (kind === 'reset') {
    $('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = $('#email').value.trim();
      var btn = $('button[type=submit]');
      if (!A.validateEmail(email)) return msg('Enter a valid email address.', true);
      busy(btn, true, 'Sending...');
      try {
        var r = await A.sendReset(email, nextUrl());
        if (r.error) throw r.error;
        showSuccess('reset');
        msg('If an account exists for that email, a reset link is on its way.', false);
      } catch (err) {
        busy(btn, false);
        msg(friendly(err), true);
      }
    });
  }

  if (kind === 'update') {
    $('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var pw = $('#password').value;
      var btn = $('button[type=submit]');
      var pp = A.passwordProblem(pw);
      if (pp) return msg(pp, true);
      busy(btn, true, 'Saving...');
      try {
        var r = await A.updatePassword(pw);
        if (r.error) throw r.error;
        msg('Password updated. Redirecting...', false);
        setTimeout(function () { go('account/'); }, 900);
      } catch (err) {
        busy(btn, false);
        msg(friendly(err), true);
      }
    });
  }

  if (kind === 'callback') {
    (async function () {
      try {
        await A.client();
        var user = await A.getUser();
        var next = nextUrl();
        if (user && next) {
          location.href = next;
          return;
        }
        go(user ? 'account/' : 'auth/sign-in/');
      } catch (e) {
        msg('Could not complete sign-in. Try again.', true);
      }
    })();
  }
})(typeof window !== 'undefined' ? window : globalThis);
