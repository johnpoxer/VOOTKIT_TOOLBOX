/* track.js — product analytics events.
 *
 * WHY THIS EXISTS. GA4 has been installed since launch but only ever fired
 * gtag('config'). Measured 3 Aug 2026: Key events 0, over 28 days. So the site
 * could report how many pages were viewed and nothing whatsoever about whether
 * anyone used a tool, hit the free limit, clicked upgrade or opened checkout.
 *
 * That is the difference between a growth experiment and a donation: a paid
 * traffic test that cannot observe its own funnel teaches nothing regardless of
 * how much is spent on it. These six events are that funnel:
 *
 *     tool_run  ->  tool_download  ->  limit_reached  ->  upgrade_click
 *                                                    ->  begin_checkout
 *                                                    ->  sign_up
 *
 * DESIGN RULES, all of which exist for a reason:
 *
 * 1. NEVER send anything the user supplied. No file names, no file contents,
 *    no typed input, no calculator values, no email addresses. Tool ids and
 *    categories are ours; everything else belongs to the person. This mirrors
 *    the constraint already documented on the error reporter, and it is not
 *    negotiable — the whole product promise is that files never leave the tab.
 *
 * 2. NEVER throw. Analytics failing must not break a tool. Every call site is
 *    the success path of something the user actually wanted.
 *
 * 3. NO-OP WITHOUT CONSENT OR GTAG. If gtag is absent (blocked, or the page
 *    loaded without it) this silently does nothing rather than queueing
 *    forever.
 */
(function (root) {
  'use strict';

  /* Event names are fixed here rather than passed as free strings by callers.
     GA4 key events are configured by exact name in the dashboard, so a typo at
     a call site produces an event that silently never counts. */
  var EVENTS = {
    TOOL_RUN: 'tool_run',
    TOOL_DOWNLOAD: 'tool_download',
    LIMIT_REACHED: 'limit_reached',
    UPGRADE_CLICK: 'upgrade_click',
    BEGIN_CHECKOUT: 'begin_checkout',
    SIGN_UP: 'sign_up'
  };

  /* Parameter allow-list. Anything not named here is dropped before sending.
     A deny-list would let a future call site leak by omission; an allow-list
     fails closed. */
  var ALLOWED = ['tool_id', 'tool_category', 'plan', 'source', 'runs_today', 'engine'];

  function clean(params) {
    var out = {};
    if (!params) return out;
    for (var i = 0; i < ALLOWED.length; i++) {
      var k = ALLOWED[i];
      if (!(k in params)) continue;
      var v = params[k];
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'number') { out[k] = v; continue; }
      /* Strings are ours (tool ids, category slugs, plan keys) but truncate and
         strip anyway — a defect that let user text reach here should degrade to
         a useless value, not a leak. */
      out[k] = String(v).slice(0, 64);
    }
    return out;
  }

  function send(name, params) {
    try {
      if (!name) return false;
      if (typeof root.gtag !== 'function') return false;
      root.gtag('event', name, clean(params));
      return true;
    } catch (e) { return false; }
  }

  root.VKTrack = {
    EVENTS: EVENTS,
    ALLOWED: ALLOWED,
    clean: clean,
    send: send,
    toolRun: function (id, cat) { return send(EVENTS.TOOL_RUN, { tool_id: id, tool_category: cat }); },
    toolDownload: function (id, cat) { return send(EVENTS.TOOL_DOWNLOAD, { tool_id: id, tool_category: cat }); },
    limitReached: function (id, runs) { return send(EVENTS.LIMIT_REACHED, { tool_id: id, runs_today: runs }); },
    upgradeClick: function (source) { return send(EVENTS.UPGRADE_CLICK, { source: source }); },
    beginCheckout: function (plan) { return send(EVENTS.BEGIN_CHECKOUT, { plan: plan }); },
    signUp: function (source) { return send(EVENTS.SIGN_UP, { source: source }); }
  };
  /* Every route to pricing, caught in one place.
   *
   * "Get Pro" sits in the header of all 1,478 pages, plus the CTA bands and the
   * usage nudge. Instrumenting each template would mean editing several and
   * silently missing whichever gets added next. One delegated listener cannot
   * drift out of date.
   *
   * `source` is the CATEGORY of the page the click came from — never the full
   * path, which on a tool page is fine but on a search or account URL could
   * carry a query string. Pathname segments only, from a fixed shape. */
  function pageSource() {
    try {
      var seg = String(root.location.pathname).split('/').filter(Boolean);
      if (seg[0] === 'tools' && seg[1]) return 'tool_' + seg[1];
      return seg[0] || 'home';
    } catch (e) { return 'unknown'; }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (e) {
      try {
        var a = e.target && e.target.closest && e.target.closest('a[href*="pricing"]');
        if (!a) return;
        /* The nudge wires its own listener with a more specific source; skip it
           so one click is not counted twice. */
        if (a.closest('.usage-nudge')) return;
        root.VKTrack.upgradeClick(pageSource());
      } catch (err) {}
    }, true);
  }

  root.VKTrack.pageSource = pageSource;
  if (typeof module === 'object' && module.exports) module.exports = root.VKTrack;
})(typeof window !== 'undefined' ? window : globalThis);
