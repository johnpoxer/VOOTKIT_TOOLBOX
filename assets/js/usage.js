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

  function showGate(ws, toolName) {
    var u = up();
    ws.innerHTML =
      '<div class="usage-gate">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>' +
      '<h2>You’ve used your ' + CFG.count + ' free tools today</h2>' +
      '<p class="note">Upgrade to Creator Pro for unlimited use, no ads, faster processing and cloud history — or come back tomorrow.</p>' +
      '<div class="usage-gate-actions">' +
      '<a class="btn btn-primary" href="' + u + 'pricing.html">See Pro plans</a>' +
      (root.VKAuth && root.VKAuth.enabled ? '<a class="btn" href="' + u + 'auth/sign-in/">Sign in</a>' : '') +
      '</div></div>';
  }

  async function init() {
    if (!doc || !CFG.enabled) return;
    var ws = doc.getElementById('workspace'); if (!ws) return;
    var toolId = ws.getAttribute('data-tool'); if (!toolId) return;
    var cat = (root.VK && root.VK.find(toolId) || {}).cat;
    var exempt = (CFG.exemptCategories || []).indexOf(cat) !== -1;
    var pro = await isPro();
    var verdict = decide({ enabled: CFG.enabled, pro: pro, exempt: exempt, count: readCount(), count_limit: CFG.count, hard: CFG.hard });
    if (verdict === 'block') { showGate(ws, toolId); return; }
    // count this use (nudge still counts + warns)
    bump();
    if (verdict === 'nudge' && root.VKUI) root.VKUI.toast('You’re over the free daily limit. Pro removes it.', { type: 'warn', duration: 5000 });
  }

  root.VKUsage = { decide: decide, readCount: readCount };
  if (typeof module === 'object' && module.exports) module.exports = { decide: decide };
  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init(); }
})(typeof window !== 'undefined' ? window : globalThis);
