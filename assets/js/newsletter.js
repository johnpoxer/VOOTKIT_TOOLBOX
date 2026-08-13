/* newsletter.js — email capture into Supabase.
 *
 * WHY EMAIL AT ALL. Every visitor Vootkit has ever had arrived from Google and
 * left as a stranger. That makes the entire business a tenant of one algorithm:
 * a ranking change removes the audience overnight and there is no way to reach
 * anyone. An email list is the only channel the site actually owns.
 *
 * WHAT THIS DELIBERATELY DOES NOT PROMISE. It never claims to store files,
 * sync anything, or "save your work". Files are processed on-device and never
 * uploaded — every tool page says so — and a signup form contradicting the page
 * it sits on is worse than no form. The offer is what is true: new tools and
 * occasional guides.
 *
 * CONSENT IS NOT DECORATION. Collecting an address you cannot lawfully email is
 * worse than collecting nothing, because it creates an obligation with no asset.
 * So every row carries:
 *   consented_at      — when they agreed, not when the row was written
 *   source            — where the signup happened, so a complaint can be traced
 *   unsubscribe_token — generated at insert, so opting out never needs a login
 * The checkbox is unticked by default and submission is blocked without it.
 * Pre-ticked consent is invalid under GDPR and is the single most common way
 * a list becomes unusable.
 *
 * THE TABLE MUST ALLOW INSERT AND DENY SELECT. RLS that permits anon reads
 * would publish the entire subscriber list to anyone who opens the console.
 * See docs/NEWSLETTER_SETUP.md for the SQL — it is not optional.
 */
(function (root) {
  'use strict';
  var doc = typeof document !== 'undefined' ? document : null;

  var TABLE = 'subscribers';
  var DONE_KEY = 'vk-newsletter';     // set once subscribed, so we stop asking

  /* ---------- pure logic (unit-tested) ---------- */

  /* Deliberately permissive. An over-strict pattern rejects valid addresses —
     plus-addressing, new TLDs, long subdomains — and the only authority on
     whether an address works is whether mail to it arrives. This catches
     obvious typos and nothing more. */
  function validEmail(s) {
    s = String(s || '').trim();
    if (s.length < 6 || s.length > 254) return false;
    if (/\s/.test(s)) return false;
    var at = s.indexOf('@');
    if (at < 1 || at !== s.lastIndexOf('@')) return false;
    var domain = s.slice(at + 1);
    return domain.indexOf('.') > 0 && !/^[.-]|[.-]$|\.\./.test(domain);
  }

  /* Should the form be offered at all? */
  function shouldOffer(state) {
    var s = state || {};
    if (s.subscribed) return false;   // never ask someone who already said yes
    return true;
  }

  function alreadySubscribed() {
    try { return !!root.localStorage.getItem(DONE_KEY); } catch (e) { return false; }
  }
  function markSubscribed() {
    try { root.localStorage.setItem(DONE_KEY, new Date().toISOString().slice(0, 10)); } catch (e) {}
  }

  /* Turn a Supabase error into something a human can act on. A duplicate is
     NOT a failure — telling an existing subscriber "error" when they are
     already on the list is confusing and makes them try again. */
  function messageFor(error) {
    if (!error) return { ok: true, text: 'Thanks — you are on the list.' };
    var code = String(error.code || '');
    var msg = String(error.message || '');
    if (code === '23505' || /duplicate|already exists/i.test(msg)) {
      return { ok: true, text: 'You are already subscribed — nothing more to do.' };
    }
    if (code === '42P01' || /relation .* does not exist/i.test(msg)) {
      /* The table has not been created yet. Say so plainly rather than blaming
         the user for a setup step they cannot see. */
      return { ok: false, text: 'Signup is not available yet. Please try again later.' };
    }
    return { ok: false, text: 'That did not save. Please try again in a moment.' };
  }

  /* ---------- the write ---------- */

  async function subscribe(email, source) {
    if (!validEmail(email)) return { ok: false, text: 'That email address does not look right.' };
    var A = root.VKAuth;
    if (!A || !A.client) return { ok: false, text: 'Signup is not available right now.' };
    try {
      var c = await A.client();
      var r = await c.from(TABLE).insert({
        email: String(email).trim().toLowerCase(),
        source: String(source || 'unknown').slice(0, 40),
        consented_at: new Date().toISOString()
      });
      var out = messageFor(r && r.error);
      if (out.ok) {
        markSubscribed();
        try { if (root.VKTrack) root.VKTrack.send('newsletter_signup', { source: source }); } catch (e) {}
      }
      return out;
    } catch (e) {
      return { ok: false, text: 'That did not save. Please try again in a moment.' };
    }
  }

  /* ---------- unsubscribe ----------
   * One click, no login. That is not a courtesy — an unsubscribe link that
   * demands a password is the fastest route to a spam complaint, and spam
   * complaints are what destroy a sending domain.
   *
   * RLS denies anon SELECT, UPDATE and DELETE on subscribers, so the page
   * cannot touch the row directly. It calls a SECURITY DEFINER function that
   * accepts only the token: no token, no effect, and no way to enumerate the
   * list. See docs/NEWSLETTER_SETUP.md. */
  function readToken(search) {
    var m = /[?&]t=([^&#]+)/.exec(String(search || ''));
    if (!m) return '';
    var raw = '';
    try { raw = decodeURIComponent(m[1]); } catch (e) { raw = m[1]; }
    /* Tokens are UUIDs. Anything else is a typo or someone probing, and both
       deserve the same answer: rejected before it reaches the database. */
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw) ? raw : '';
  }

  async function unsubscribe(token) {
    if (!token) return { ok: false, text: 'That unsubscribe link is not valid. Please use the link from the email.' };
    var A = root.VKAuth;
    if (!A || !A.client) return { ok: false, text: 'We could not reach the server. Please try again in a moment.' };
    try {
      var c = await A.client();
      var r = await c.rpc('unsubscribe_by_token', { token: token });
      if (r && r.error) return { ok: false, text: 'We could not process that just now. Please try again in a moment.' };
      /* The function returns false when no row matched. That is still a success
         from the reader's point of view: they are not on the list. Saying
         "not found" would only make them wonder whether it worked. */
      try { root.localStorage.removeItem(DONE_KEY); } catch (e) {}
      return { ok: true, text: 'Done — you have been removed. You will not get any more emails from us.' };
    } catch (e) {
      return { ok: false, text: 'We could not process that just now. Please try again in a moment.' };
    }
  }

  /* Mounts on the unsubscribe page only. */
  async function initUnsubscribe() {
    if (!doc) return;
    var host = doc.querySelector('[data-unsubscribe]');
    if (!host) return;
    var token = readToken(root.location && root.location.search);
    var res = await unsubscribe(token);
    host.className = 'nl-status ' + (res.ok ? 'ok' : 'err');
    host.textContent = res.text;
  }

  /* ---------- the form ---------- */

  function build(source, compact) {
    var wrap = doc.createElement('form');
    wrap.className = 'nl' + (compact ? ' nl-compact' : '');
    wrap.setAttribute('novalidate', 'novalidate');
    var host = doc.querySelector('[data-newsletter="' + source + '"]');
    var placeholder = host && host.getAttribute('data-nl-placeholder') || 'you@example.com';
    var buttonText = host && host.getAttribute('data-nl-button') || 'Subscribe';
    wrap.innerHTML =
      (compact ? '' : '<h3 class="nl-title">New tools, now and then</h3>') +
      '<p class="nl-lede">A short email when we ship something worth knowing about. ' +
      'No more than monthly, and you can leave in one click.</p>' +
      '<div class="nl-row">' +
        '<label class="nl-lab" for="nl-e-' + source + '">Email address</label>' +
        '<input class="field nl-input" type="email" id="nl-e-' + source + '" name="email" ' +
               'autocomplete="email" placeholder="' + placeholder.replace(/"/g, '&quot;') + '" required>' +
        '<button class="btn btn-primary nl-btn" type="submit">' + buttonText.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</button>' +
      '</div>' +
      '<label class="nl-consent">' +
        '<input type="checkbox" class="nl-check" required> ' +
        '<span>Yes, email me about new Vootkit tools. I can unsubscribe at any time.</span>' +
      '</label>' +
      '<p class="nl-status" role="status" aria-live="polite"></p>';

    var input = wrap.querySelector('.nl-input');
    var check = wrap.querySelector('.nl-check');
    var btn = wrap.querySelector('.nl-btn');
    var status = wrap.querySelector('.nl-status');

    wrap.addEventListener('submit', async function (e) {
      e.preventDefault();
      status.className = 'nl-status';
      if (!check.checked) {
        status.classList.add('err');
        status.textContent = 'Please tick the box to confirm you want these emails.';
        check.focus();
        return;
      }
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = 'Subscribing…';
      var res = await subscribe(input.value, source);
      btn.textContent = label;
      status.classList.add(res.ok ? 'ok' : 'err');
      status.textContent = res.text;
      if (res.ok) {
        input.disabled = true; check.disabled = true; btn.hidden = true;
      } else {
        btn.disabled = false;
      }
    });
    return wrap;
  }

  /* Mount into any [data-newsletter] element. The attribute value is the
     source, which is stored with the row so signup quality per placement is
     measurable rather than assumed. */
  function init() {
    if (!doc) return;
    var slots = doc.querySelectorAll('[data-newsletter]');
    if (!slots.length) return;
    if (!shouldOffer({ subscribed: alreadySubscribed() })) {
      for (var k = 0; k < slots.length; k++) slots[k].hidden = true;
      return;
    }
    /* NEVER TWO FORMS AT ONCE. The footer slot is on every page; the blog and
       tool-success slots are earned. When an earned slot is present the footer
       one is removed, because two identical forms on one screen read as a bug
       and split the attention that one of them needed. */
    var earned = false;
    for (var j = 0; j < slots.length; j++) {
      if ((slots[j].getAttribute('data-newsletter') || '') !== 'footer') { earned = true; break; }
    }

    for (var i = 0; i < slots.length; i++) {
      var el = slots[i];
      if (earned && (el.getAttribute('data-newsletter') || '') === 'footer') { el.hidden = true; continue; }
      el.hidden = false;
      if (el.getAttribute('data-nl-built')) continue;
      el.setAttribute('data-nl-built', '1');
      el.appendChild(build(el.getAttribute('data-newsletter') || 'unknown',
                           el.hasAttribute('data-nl-compact')));
    }
  }

  root.VKNewsletter = {
    TABLE: TABLE, DONE_KEY: DONE_KEY,
    validEmail: validEmail, shouldOffer: shouldOffer, messageFor: messageFor,
    alreadySubscribed: alreadySubscribed, subscribe: subscribe, build: build, init: init,
    readToken: readToken, unsubscribe: unsubscribe, initUnsubscribe: initUnsubscribe
  };
  if (typeof module === 'object' && module.exports) module.exports = root.VKNewsletter;
  function boot() { init(); initUnsubscribe(); }
  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot(); }
})(typeof window !== 'undefined' ? window : globalThis);
