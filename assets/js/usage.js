/* usage.js — free-tier daily usage gate. Runs on tool pages only.
 *
 * OFF unless VK_CONFIG.freeLimit.enabled. It's a CLIENT-SIDE counter (tools run
 * in the browser), so it nudges toward Pro but isn't a hard wall — a determined
 * user can clear storage. Signed-in Pro/Teams users are exempt; exemptCategories
 * (e.g. downloaders) are never metered.
 *
 * Pure `decide()` is exported and unit-tested. */
(function (root) {
  'use strict';
  var doc = typeof document !== 'undefined' ? document : null;
  var CFG = (root.VK_CONFIG && root.VK_CONFIG.freeLimit) || { enabled: false };

  function todayKey() { return 'vk-uses:' + new Date().toISOString().slice(0, 10); }
  function readCount() { try { return parseInt(root.localStorage.getItem(todayKey()) || '0', 10) || 0; } catch (e) { return 0; } }
  function bump() { try { root.localStorage.setItem(todayKey(), String(readCount() + 1)); } catch (e) {} }

  /* pure: what to do given the state. returns 'allow' | 'nudge' | 'block' */
  function decide(o) {
    if (!o.enabled || o.pro || o.exempt) return 'allow';
    if (o.count < o.count_limit) return 'allow';
    return o.hard ? 'block' : 'nudge';
  }

  function up() { return (root.VKAuth && root.VKAuth.upPrefix) ? root.VKAuth.upPrefix(location.pathname) : '../../../'; }

  async function isPro() {
    var A = root.VKAuth;
    if (!A || !A.enabled) return false;
    try {
      var user = await A.getUser(); if (!user) return false;
      var c = await A.client();
      var r = await c.from('profiles').select('plan').eq('id', user.id).single();
      var plan = r && r.data && r.data.plan;
      return plan === 'creator_pro' || plan === 'creator_teams';
    } catch (e) { return false; }
  }

  /* The upgrade prompt shown when someone passes the free limit but is not
     being blocked. The previous version was a five-second toast reading "You're
     over the free daily limit" — which interrupts, names no price, and offers
     nothing to click. It cost goodwill and converted nobody.
     This states the price and links to it, and it appears AFTER the tool has
     already done its work, so nothing is being withheld. */
  function showNudge(ws) {
    if (!doc || !ws || ws.querySelector('.usage-nudge')) return;
    var amount = 8;
    try {
      var plans = root.VK_CONFIG && root.VK_CONFIG.stripe && root.VK_CONFIG.stripe.plans;
      if (plans && plans.creator_pro_monthly && plans.creator_pro_monthly.amount) {
        amount = plans.creator_pro_monthly.amount;
      }
    } catch (e) {}
    var n = doc.createElement('div');
    n.className = 'usage-nudge';
    n.innerHTML =
      '<p><strong>That was your ' + CFG.count + 'th free run today.</strong> ' +
      'Everything still works — Creator Pro is $' + amount + ' a month for unlimited runs, no ads and saved workflows.</p>' +
      '<a class="btn btn-primary btn-sm" href="' + up() + 'pricing.html">See Pro</a>';
    ws.appendChild(n);

    /* The two halves of this step are separately interesting: how many people
       reach the limit at all, and what share of those act on it. Reporting only
       the click would make a nudge nobody ever sees look identical to one
       everybody ignores. */
    try {
      if (root.VKTrack) {
        root.VKTrack.limitReached(ws.getAttribute('data-tool'), readCount());
        var cta = n.querySelector('a');
        if (cta) cta.addEventListener('click', function () { root.VKTrack.upgradeClick('usage_nudge'); });
      }
    } catch (e) {}
  }

  function showGate(ws, toolName) {
    var u = up();
    ws.innerHTML =
      '<div class="usage-gate">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>' +
      '<h2>You’ve used your ' + CFG.count + ' free tools today</h2>' +
      '<p class="note">Upgrade to Creator Pro for unlimited use, no ads and saved workflows — or come back tomorrow.</p>' +
      '<div class="usage-gate-actions">' +
      '<a class="btn btn-primary" href="' + u + 'pricing.html">See Pro plans</a>' +
      (root.VKAuth && root.VKAuth.enabled ? '<a class="btn" href="' + u + 'auth/sign-in/">Sign in</a>' : '') +
      '</div></div>';
  }

  /* A USE IS A RUN, NOT A PAGE VIEW.
   *
   * This used to bump() on DOMContentLoaded, which counted every page LOAD as a
   * use. Someone browsing five tool pages — exactly what the related-tools
   * module is designed to make them do — would hit the limit having processed
   * nothing at all. On a site whose traffic strategy is search, that gates the
   * visitor before they have seen the product work.
   *
   * All three engines (filetool, widget, calc) already call
   * VKConvert.onToolSuccess when a tool actually completes. That is the honest
   * definition of a use, so the counter hangs off it. */
  function countRun() {
    if (!doc || !CFG.enabled) return;
    var ws = doc.getElementById('workspace'); if (!ws) return;
    var toolId = ws.getAttribute('data-tool'); if (!toolId) return;
    if (isExempt(toolId)) return;

    bump();
    isPro().then(function (pro) {
      var verdict = decide({
        enabled: CFG.enabled, pro: pro, exempt: isExempt(toolId),
        count: readCount(), count_limit: CFG.count, hard: CFG.hard
      });
      if (verdict === 'nudge') showNudge(ws);
    });
  }

  function isExempt(toolId) {
    var cat = (root.VK && root.VK.find && root.VK.find(toolId) || {}).cat;
    return (CFG.exemptCategories || []).indexOf(cat) !== -1;
  }

  /* The gate still runs at page load, because blocking has to happen BEFORE the
     work is done — there is no point letting someone wait through a two-minute
     encode and then refusing them the file. Only reached when hard:true. */
  async function init() {
    if (!doc || !CFG.enabled || !CFG.hard) return;
    var ws = doc.getElementById('workspace'); if (!ws) return;
    var toolId = ws.getAttribute('data-tool'); if (!toolId) return;
    var pro = await isPro();
    var verdict = decide({
      enabled: CFG.enabled, pro: pro, exempt: isExempt(toolId),
      count: readCount(), count_limit: CFG.count, hard: CFG.hard
    });
    if (verdict === 'block') showGate(ws, toolId);
  }

  root.VKUsage = {
    decide: decide, readCount: readCount, countRun: countRun,
    /* Exposed for deliver.js. showGate already existed and is already the right
       screen — the limit is now reachable from two directions (page load, and
       the moment a download is attempted) and both must show the same thing. */
    showLimit: showGate, isPro: isPro
  };
  if (typeof module === 'object' && module.exports) module.exports = { decide: decide };
  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init(); }
})(typeof window !== 'undefined' ? window : globalThis);
