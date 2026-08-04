/* consent-ui.js — the banner. Loaded deferred, separate from consent.js.
 *
 * The SPLIT IS THE POINT. consent.js sets Consent Mode defaults and must run
 * inline in the head before gtag('config'), so it is kept tiny and free of DOM
 * work. This file paints the banner and can arrive whenever — the signals are
 * already correct before it does, so a slow banner costs compliance nothing.
 *
 * Design constraints that are not cosmetic:
 *  - Reject must be exactly as easy as Accept. A hidden or greyed decline is
 *    the thing regulators actually fine people for, and it is the most common
 *    dark pattern in cookie banners.
 *  - The banner must not cover the tool. It docks to the bottom and the page
 *    stays usable behind it, because a visitor who cannot reach the tool
 *    bounces and is worth nothing consented or not.
 *  - No layout shift: it is fixed-position, so it never pushes content.
 */
(function (root) {
  'use strict';
  var doc = typeof document !== 'undefined' ? document : null;

  function up() {
    return (root.VKAuth && root.VKAuth.upPrefix) ? root.VKAuth.upPrefix(location.pathname) : '';
  }

  function dismiss(el, granted) {
    if (root.VKConsent) root.VKConsent.update(granted);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    /* Recorded so the effect on revenue is measurable rather than assumed —
       a consent rate is the multiplier on every EEA RPM figure. */
    try { if (root.VKTrack) root.VKTrack.send('consent_choice', { source: granted ? 'accept' : 'reject' }); } catch (e) {}
  }

  function build() {
    var wrap = doc.createElement('div');
    wrap.className = 'consent-bar';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-label', 'Cookie choices');
    wrap.innerHTML =
      '<div class="consent-inner">' +
        '<p class="consent-text">' +
          'We use cookies for analytics and advertising. ' +
          '<strong>Your files are never part of this</strong> — they are processed on your device and never uploaded. ' +
          '<a href="' + up() + 'cookies.html">Cookie Policy</a>' +
        '</p>' +
        '<div class="consent-actions">' +
          '<button type="button" class="btn btn-sm" data-consent="reject">Reject</button>' +
          '<button type="button" class="btn btn-primary btn-sm" data-consent="accept">Accept</button>' +
        '</div>' +
      '</div>';
    wrap.querySelector('[data-consent="accept"]').addEventListener('click', function () { dismiss(wrap, true); });
    wrap.querySelector('[data-consent="reject"]').addEventListener('click', function () { dismiss(wrap, false); });
    return wrap;
  }

  function init() {
    if (!doc || !root.VKConsent || !root.VKConsent.needsBanner()) return;
    var cfg = (root.VK_CONFIG && root.VK_CONFIG.consent) || {};
    if (cfg.enabled === false) return;   // a network CMP has taken over
    doc.body.appendChild(build());
  }

  root.VKConsentUI = { build: build, init: init };
  if (typeof module === 'object' && module.exports) module.exports = root.VKConsentUI;
  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init(); }
})(typeof window !== 'undefined' ? window : globalThis);
