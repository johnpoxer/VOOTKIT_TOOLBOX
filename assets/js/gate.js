/* gate.js — the signup ask at the moment the result is ready.
 *
 * THE ONE THING THAT MAKES OR BREAKS THIS.
 * The user clicked Download. Whatever happens next, the thing they get at the
 * end must be the download. Not a dashboard, not a welcome page, not the tool
 * page reloaded and empty. A gate that makes someone create an account and then
 * re-do their work is worse than no gate: they have paid the price and not
 * received the thing, and that is the version people write angry reviews about.
 *
 * So the form is INLINE. No navigation, no page change, no redirect. The
 * finished blob stays in memory the whole time and is handed over the instant
 * the account exists. That constraint is why this is a modal and not a link to
 * /auth/sign-up/.
 *
 * THE EMAIL-CONFIRMATION PROBLEM, AND WHY WE RELEASE ANYWAY.
 * This project's Supabase has email confirmation ON — verified from the data,
 * not assumed: two of the three existing users took 44 and 102 seconds between
 * created_at and email_confirmed_at, which is a human reading an email and
 * clicking a link. (The third took 0.02s, the signature of an OAuth signup
 * where the provider vouches for the address.)
 *
 * That means signUp() returns a user with NO SESSION. If we waited for a
 * session before releasing the file, every email signup would dead-end in an
 * inbox with their work still trapped on a page they have now left.
 *
 * So the release condition is "the account was created", not "the session is
 * live". We have what we wanted — a real account and a real address — and the
 * user gets what they wanted. Confirmation still gates signing back in later,
 * which is where it actually matters. Nothing is weakened in Supabase to
 * achieve this; we simply stopped asking the gate to enforce something it was
 * never able to enforce anyway, given the file is already in the browser.
 *
 * GOOGLE IS DIFFERENT AND HAS TO BE.
 * OAuth navigates away, and the blob does not survive the round trip. So before
 * the redirect we stash the finished file in IndexedDB — on the user's own
 * device, where it already was — plus where to come back to. The callback sends
 * them to that page, the file is restored, delivered, and deleted immediately.
 * It is never uploaded and it never lives longer than ten minutes.
 */
(function (root) {
  'use strict';

  var doc = typeof document !== 'undefined' ? document : null;

  var DB_NAME = 'vk-pending';
  var STORE = 'downloads';
  var RETURN_KEY = 'vk-gate-return';   // where to come back to after OAuth
  var PENDING_TTL_MS = 10 * 60 * 1000; // a stale blob is junk, not a feature

  /* ---------- pure logic (unit-tested in test/gate.test.js) ---------- */

  /* Should the pending file still be delivered when the user lands back here?
     Anything older than the TTL belongs to a session the user has forgotten
     about, and silently downloading a file somebody asked for last week is
     alarming rather than helpful. */
  function pendingIsFresh(rec, now, ttl) {
    if (!rec || !rec.at) return false;
    var age = (now == null ? Date.now() : now) - rec.at;
    return age >= 0 && age < (ttl == null ? PENDING_TTL_MS : ttl);
  }

  /* Turn a Supabase auth error into something the person can act on.
     Deliberately never echoes the raw message: those name the provider, quote
     internal constraints, and occasionally repeat the address back in a way
     that reads like a leak. */
  function authMessage(error) {
    if (!error) return { ok: true, text: '' };
    var m = String(error.message || '').toLowerCase();
    if (/already registered|already exists|user already/.test(m)) {
      return { ok: false, text: 'That email already has an account — sign in instead.', signin: true };
    }
    if (/invalid login|invalid credentials/.test(m)) {
      return { ok: false, text: 'That email and password do not match.' };
    }
    if (/password/.test(m) && /short|least|weak/.test(m)) {
      return { ok: false, text: 'Please use a password of at least 8 characters.' };
    }
    if (/rate|too many/.test(m)) {
      return { ok: false, text: 'Too many attempts just now. Please wait a minute and try again.' };
    }
    if (/email|address/.test(m) && /invalid/.test(m)) {
      return { ok: false, text: 'That email address does not look right.' };
    }
    return { ok: false, text: 'That did not work. Please try again in a moment.' };
  }

  /* A signup counts as unlocked when the account exists, whether or not a
     session came back with it — see the header note on email confirmation. */
  function unlockedBySignup(result) {
    if (!result || result.error) return false;
    var d = result.data || {};
    return !!(d.user || d.session);
  }

  /* Did the account come back already usable, or is there an email waiting? */
  function needsConfirmation(result) {
    var d = (result && result.data) || {};
    return !!(d.user && !d.session);
  }

  /* ---------- pending download store (IndexedDB, this device only) -------- */

  function openDb() {
    return new Promise(function (res, rej) {
      if (!root.indexedDB) return rej(new Error('no idb'));
      var rq = root.indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = function () {
        var db = rq.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    });
  }

  function idbPut(rec) {
    return openDb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(rec);
        tx.oncomplete = function () { db.close(); res(true); };
        tx.onerror = function () { db.close(); rej(tx.error); };
      });
    });
  }

  function idbTake(id) {
    return openDb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readwrite');
        var st = tx.objectStore(STORE);
        var g = st.get(id);
        g.onsuccess = function () {
          var rec = g.result;
          st.delete(id);              // read once, then gone
          tx.oncomplete = function () { db.close(); res(rec || null); };
        };
        g.onerror = function () { db.close(); rej(g.error); };
      });
    });
  }

  /* ---------- the modal ---------- */

  function el(tag, attrs, kids) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  }

  var openModal = null;

  function close() {
    if (!openModal) return;
    if (openModal.el.parentNode) openModal.el.parentNode.removeChild(openModal.el);
    doc.removeEventListener('keydown', openModal.onKey, true);
    if (openModal.lastFocus && openModal.lastFocus.focus) openModal.lastFocus.focus();
    openModal = null;
  }

  function open(opts) {
    var o = opts || {};
    if (!doc || openModal) return;
    var copy = o.copy || { title: 'Your file is ready', body: 'Create a free account to download it.' };
    var mode = 'signup';   // or 'signin'

    var status = el('p', { class: 'gate-status', role: 'status', 'aria-live': 'polite' });
    var email = el('input', { class: 'field', type: 'email', id: 'gate-email', autocomplete: 'email',
                              placeholder: 'you@example.com', required: 'required' });
    var pass = el('input', { class: 'field', type: 'password', id: 'gate-pass', autocomplete: 'new-password',
                             placeholder: 'At least 8 characters', minlength: '8', required: 'required' });
    var submit = el('button', { class: 'btn btn-primary gate-submit', type: 'submit', text: 'Create account & download' });
    var toggle = el('button', { class: 'btn btn-quiet gate-toggle', type: 'button',
                                text: 'Already have an account? Sign in' });
    var title = el('h2', { class: 'gate-title', id: 'gate-title', text: copy.title });
    var lede = el('p', { class: 'gate-lede', text: copy.body });

    function setMode(next) {
      mode = next;
      title.textContent = next === 'signup' ? copy.title : 'Welcome back';
      lede.textContent = next === 'signup' ? copy.body : 'Sign in and your download will start.';
      submit.textContent = next === 'signup' ? 'Create account & download' : 'Sign in & download';
      pass.setAttribute('autocomplete', next === 'signup' ? 'new-password' : 'current-password');
      pass.setAttribute('placeholder', next === 'signup' ? 'At least 8 characters' : 'Your password');
      toggle.textContent = next === 'signup'
        ? 'Already have an account? Sign in'
        : 'Need an account? Create one';
      status.className = 'gate-status';
      status.textContent = '';
    }
    toggle.addEventListener('click', function () { setMode(mode === 'signup' ? 'signin' : 'signup'); email.focus(); });

    function unlock(msg) {
      /* The account now exists either way — that part succeeded and must not be
         undone. But if the file itself did not make it out of the browser, say
         so and leave the dialog open, rather than announcing a download that
         never started and closing over the evidence. */
      var delivered = true;
      try { delivered = o.onUnlocked ? o.onUnlocked() !== false : true; }
      catch (e) { delivered = false; }
      if (!delivered) {
        status.className = 'gate-status err';
        status.textContent = 'Your account is ready, but the download did not start. Run the tool again and it will download straight away.';
        submit.hidden = true; toggle.hidden = true;
        return;
      }
      if (msg) {
        /* The file is already downloading at this point. This is the only
           moment we will ever have their attention about the inbox, so it is
           said here rather than in an email they cannot yet receive. */
        status.className = 'gate-status ok';
        status.textContent = msg;
        submit.hidden = true; toggle.hidden = true; email.disabled = true; pass.disabled = true;
        setTimeout(close, 6000);
      } else {
        close();
      }
    }

    var form = el('form', { class: 'gate-form', novalidate: 'novalidate' }, [
      el('div', { class: 'gate-field' }, [el('label', { for: 'gate-email', text: 'Email' }), email]),
      el('div', { class: 'gate-field' }, [el('label', { for: 'gate-pass', text: 'Password' }), pass]),
      submit, status
    ]);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var A = root.VKAuth;
      status.className = 'gate-status';
      if (!A || !A.enabled) {
        /* Accounts are unavailable. Withholding the file to protect a signup
           that cannot happen would be pure loss — hand it over. */
        return unlock();
      }
      if (!A.validateEmail || !A.validateEmail(email.value)) {
        status.className = 'gate-status err';
        status.textContent = 'That email address does not look right.';
        return email.focus();
      }
      if (mode === 'signup' && A.passwordProblem) {
        var pp = A.passwordProblem(pass.value);
        if (pp) { status.className = 'gate-status err'; status.textContent = pp; return pass.focus(); }
      }

      submit.disabled = true;
      var label = submit.textContent;
      submit.textContent = 'One moment…';
      try {
        if (mode === 'signup') {
          var r = await A.signUp(email.value, pass.value, '');
          if (unlockedBySignup(r)) {
            try { if (root.VKTrack) root.VKTrack.signUp('gate', 'password'); } catch (e2) {}
            return unlock(needsConfirmation(r)
              ? 'Your download has started. Check your email to confirm the account so you can sign in next time.'
              : '');
          }
          var m = authMessage(r && r.error);
          if (m.signin) setMode('signin');
          status.className = 'gate-status err';
          status.textContent = m.text;
        } else {
          var r2 = await A.signIn(email.value, pass.value);
          if (r2 && !r2.error) return unlock();
          status.className = 'gate-status err';
          status.textContent = authMessage(r2 && r2.error).text;
        }
      } catch (e3) {
        status.className = 'gate-status err';
        status.textContent = 'That did not work. Please try again in a moment.';
      }
      submit.disabled = false;
      submit.textContent = label;
    });

    /* Google. Navigates away, so the finished file has to be parked first. */
    var google = el('button', { class: 'btn gate-google', type: 'button' }, [
      el('span', { html: '<svg viewBox="0 0 18 18" width="16" height="16" aria-hidden="true"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/></svg>' }),
      el('span', { text: 'Continue with Google' })
    ]);
    google.addEventListener('click', async function () {
      var A = root.VKAuth;
      if (!A || !A.signInOAuth) return;
      google.disabled = true;
      try {
        if (o.blob) {
          await idbPut({ id: 'pending', blob: o.blob, name: o.name, toolId: o.toolId, at: Date.now() });
          try { root.localStorage.setItem(RETURN_KEY, root.location.pathname + root.location.search); } catch (e) {}
        }
        await A.signInOAuth('google');
      } catch (e) {
        google.disabled = false;
        status.className = 'gate-status err';
        status.textContent = 'Google sign-in is not available right now. Use email instead.';
      }
    });

    var card = el('div', {
      class: 'gate-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'gate-title'
    }, [
      title, lede,
      el('ul', { class: 'gate-benefits' }, [
        el('li', { text: 'Your tool history, on any device' }),
        el('li', { text: 'Jump straight back to the tools you use' }),
        el('li', { text: 'Free — no card, and your files still never leave your device' })
      ]),
      google,
      el('p', { class: 'gate-or', text: 'or' }),
      form,
      toggle,
      el('button', { class: 'btn btn-quiet gate-cancel', type: 'button', text: 'Not now', onClick: close })
    ]);

    var backdrop = el('div', { class: 'gate-backdrop' }, [card]);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });

    function onKey(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      /* Focus must not escape the dialog while it is open — a keyboard user
         tabbing into the page behind a modal is lost with no way back. */
      var f = card.querySelectorAll('button:not([hidden]), input:not([disabled]), a[href]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    doc.addEventListener('keydown', onKey, true);

    openModal = { el: backdrop, onKey: onKey, lastFocus: doc.activeElement };
    doc.body.appendChild(backdrop);
    setMode('signup');
    email.focus();
  }

  /* ---------- resume after an OAuth round trip ---------- */

  /* Runs on every page load. If a file was parked before a Google redirect and
     the user is now signed in, deliver it and delete it. */
  async function resume() {
    if (!doc || !root.indexedDB) return;
    var rec = null;
    try { rec = await idbTake('pending'); } catch (e) { return; }
    if (!rec || !rec.blob) return;
    if (!pendingIsFresh(rec, Date.now())) return;
    try {
      var A = root.VKAuth;
      if (!A || !A.getUser) return;
      var user = await A.getUser();
      if (!user) return;                     // signed in is the whole condition
      if (root.VKDeliver) {
        root.VKDeliver.handover(rec.blob, rec.name);
        var cat;
        try { cat = (root.VK && root.VK.find && root.VK.find(rec.toolId) || {}).cat; } catch (e) {}
        try { if (root.VKTrack) { root.VKTrack.downloadUnlocked(rec.toolId, cat); root.VKTrack.toolDownload(rec.toolId, cat); } } catch (e) {}
      }
    } catch (e) { /* the file is already gone from the store; nothing to undo */ }
  }

  root.VKGate = {
    open: open, close: close, resume: resume,
    pendingIsFresh: pendingIsFresh, authMessage: authMessage,
    unlockedBySignup: unlockedBySignup, needsConfirmation: needsConfirmation,
    RETURN_KEY: RETURN_KEY, PENDING_TTL_MS: PENDING_TTL_MS
  };
  if (typeof module === 'object' && module.exports) module.exports = root.VKGate;

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', resume);
    else resume();
  }
})(typeof window !== 'undefined' ? window : globalThis);
