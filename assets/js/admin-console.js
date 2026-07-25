/* admin-console.js — the Vootkit Command Center (owner-only).
 * Gated by Netlify Identity; pulls live stats from /.netlify/functions/admin-stats
 * (which is itself locked to the owner + service role). */
(function (root) {
  'use strict';
  var doc = document;
  var ADMIN = 'poxer7128@gmail.com';
  var host = doc.getElementById('admin-console');
  if (!host) return;
  var BUILD = root.__VK_ADMIN || { tools: 0, categories: 0, blogPosts: 0 };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return (n == null ? 0 : n).toLocaleString(); }
  function kpi(label, value) { return '<div class="adm-kpi"><span>' + esc(label) + '</span><b>' + value + '</b></div>'; }

  function gate(msg, showLogin) {
    host.innerHTML = '<div class="adm-gate"><span class="eyebrow">Command Center</span><h1 class="page-h1">Vootkit</h1>' +
      '<p class="page-lede">' + esc(msg) + '</p>' +
      (showLogin ? '<button class="btn btn-primary" id="adm-login">Log in</button>' : '') + '</div>';
    var b = doc.getElementById('adm-login');
    if (b) b.addEventListener('click', function () { root.netlifyIdentity.open('login'); });
  }

  async function load(user) {
    gate('Loading your command center…', false);
    var token;
    try { token = await user.jwt(); } catch (e) { token = user.token && user.token.access_token; }
    var res, data;
    try {
      res = await fetch('/.netlify/functions/admin-stats', { headers: { 'Authorization': 'Bearer ' + token } });
      data = await res.json().catch(function () { return {}; });
    } catch (e) { gate('Couldn’t reach the stats service. Is the site deployed?', false); return; }
    if (!res.ok || !data.stats) { gate((data && data.error) || 'Could not load stats.', false); return; }
    render(user, data.stats);
  }

  function render(user, s) {
    var plans = s.plans || {}, recent = s.recent_users || [], tops = s.top_tools || [], days = s.signups_daily || [];
    var maxN = days.reduce(function (m, d) { return Math.max(m, d.n); }, 1);
    var bars = days.length
      ? days.map(function (d) { return '<div class="adm-bar" title="' + esc(d.label) + ': ' + d.n + '"><i style="height:' + Math.round(d.n / maxN * 100) + '%"></i><span>' + esc(d.label.slice(5)) + '</span></div>'; }).join('')
      : '<p class="note">No signups in the last 30 days.</p>';
    var toolsRows = tops.length
      ? tops.map(function (t) { return '<tr><td>' + esc(t.tool_id) + '</td><td>' + num(t.uses) + '</td></tr>'; }).join('')
      : '<tr><td colspan="2" class="note">No tool usage logged yet — history records while users are signed in.</td></tr>';
    var usersRows = recent.length
      ? recent.map(function (u) { return '<tr><td>' + esc(u.display_name || '—') + '</td><td>' + esc(u.email || '—') + '</td><td><span class="adm-plan">' + esc(u.plan) + '</span></td><td>' + esc(u.joined) + '</td></tr>'; }).join('')
      : '<tr><td colspan="4" class="note">No users yet.</td></tr>';

    host.innerHTML =
      '<header class="adm-head"><div><span class="eyebrow">Command Center</span><h1 class="page-h1">Vootkit</h1></div>' +
        '<div class="adm-user"><span>' + esc(user.email) + '</span><button class="btn btn-sm" id="adm-out">Sign out</button></div></header>' +
      '<div class="adm-kpis">' +
        kpi('Total users', num(s.total_users)) + kpi('New today', num(s.users_today)) +
        kpi('New · 7 days', num(s.users_7d)) + kpi('New · 30 days', num(s.users_30d)) +
        kpi('Short links', num(s.total_links)) + kpi('Link clicks', num(s.total_clicks)) +
        kpi('Tools live', num(BUILD.tools)) + kpi('Blog posts', num(BUILD.blogPosts)) +
      '</div>' +
      '<div class="adm-cols">' +
        '<section class="adm-card"><h2>Signups · last 30 days</h2><div class="adm-chart">' + bars + '</div></section>' +
        '<section class="adm-card"><h2>Plans</h2><div class="adm-plans">' +
          '<div><b>' + num(plans.free || 0) + '</b><span>Free</span></div>' +
          '<div><b>' + num(plans.creator_pro || 0) + '</b><span>Creator Pro</span></div>' +
          '<div><b>' + num(plans.creator_teams || 0) + '</b><span>Teams</span></div>' +
        '</div><p class="note">Revenue metrics (MRR, churn) unlock once Stripe checkout is live.</p></section>' +
      '</div>' +
      '<section class="adm-card"><h2>Top tools by usage</h2><div class="adm-scroll"><table class="adm-table"><thead><tr><th>Tool</th><th>Uses</th></tr></thead><tbody>' + toolsRows + '</tbody></table></div></section>' +
      '<section class="adm-card"><h2>Recent users</h2><div class="adm-scroll"><table class="adm-table"><thead><tr><th>Name</th><th>Email</th><th>Plan</th><th>Joined</th></tr></thead><tbody>' + usersRows + '</tbody></table></div></section>' +
      '<section class="adm-card"><h2>Content &amp; SEO</h2><div class="adm-kpis adm-mini">' +
        kpi('Tools live', num(BUILD.tools)) + kpi('Categories', num(BUILD.categories)) + kpi('Blog posts', num(BUILD.blogPosts)) +
      '</div><div class="adm-links"><a class="btn btn-sm" href="/admin/">Manage blog (CMS)</a> <a class="btn btn-sm" href="/tools/">All tools</a> <a class="btn btn-sm" href="/pricing.html">Pricing</a></div></section>' +
      '<p class="note adm-foot">More modules (support, billing, affiliates) light up here as those systems come online.</p>';

    var out = doc.getElementById('adm-out');
    if (out) out.addEventListener('click', function () { root.netlifyIdentity.logout(); });
  }

  function handle(user) {
    if (!user) { gate('Sign in with your Vootkit admin account to open the command center.', true); return; }
    if (String(user.email || '').toLowerCase() !== ADMIN) {
      gate('This dashboard is restricted to the Vootkit owner. You’ve been signed out.', false);
      try { root.netlifyIdentity.logout(); } catch (e) {}
      return;
    }
    load(user);
  }

  function start() {
    if (!root.netlifyIdentity) { gate('Admin login is unavailable — enable Netlify Identity on the site.', false); return; }
    root.netlifyIdentity.on('init', function (user) {
      handle(user);
      root.netlifyIdentity.on('login', function (u) { try { root.netlifyIdentity.close(); } catch (e) {} handle(u); });
      root.netlifyIdentity.on('logout', function () { gate('Signed out.', true); });
    });
    root.netlifyIdentity.init();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
