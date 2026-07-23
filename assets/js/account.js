/* account.js — the signed-in dashboard. Reads the user's profile, favorites and
 * history from Supabase (RLS-protected). Runs only on /account/.
 * Requires auth.js + a configured anon key. Degrades to a notice otherwise. */
(function (root) {
  'use strict';
  var doc = document, A = root.VKAuth, VK = root.VK;
  var host = doc.getElementById('account');
  if (!host) return;

  function el(t, a, k) { var n = doc.createElement(t); if (a) Object.keys(a).forEach(function (x) { if (x === 'class') n.className = a[x]; else if (x === 'html') n.innerHTML = a[x]; else if (x === 'text') n.textContent = a[x]; else if (x.slice(0, 2) === 'on' && typeof a[x] === 'function') n.addEventListener(x.slice(2).toLowerCase(), a[x]); else if (a[x] != null) n.setAttribute(x, a[x]); }); (k || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); }); return n; }
  function up() { return A ? A.upPrefix(location.pathname) : ''; }
  function toolHref(id, cat) { return up() + 'tools/' + cat + '/' + id + '/'; }
  function notice(msg) { host.innerHTML = ''; host.appendChild(el('div', { class: 'vk-empty' }, [el('h3', { text: 'Accounts are launching soon' }), el('p', { class: 'note', text: msg })])); }

  if (!A || !A.enabled) { notice('Sign-in isn’t switched on yet. The tools all work without an account in the meantime.'); return; }

  var user, client;

  async function init() {
    user = await A.requireAuth(); if (!user) return; // redirected
    client = await A.client();
    render();
  }

  function tabButton(id, label) { return el('button', { class: 'btn', role: 'tab', id: 'at-' + id, 'aria-controls': 'ap-' + id, text: label }); }

  async function render() {
    var name = (user.user_metadata && user.user_metadata.display_name) || user.email;
    host.innerHTML = '';
    host.appendChild(el('header', { class: 'acct-head' }, [
      el('div', { class: 'acct-avatar', text: (name[0] || 'A').toUpperCase() }),
      el('div', {}, [el('h1', { class: 'page-h1', text: name }), el('p', { class: 'note', text: user.email })]),
      el('button', { class: 'btn', type: 'button', text: 'Sign out', onClick: function () { A.signOut(); } })
    ]));

    var tabs = el('div', { 'data-tabs': '' }, [
      el('div', { role: 'tablist', class: 'wbtns', 'aria-label': 'Account sections' }, [
        tabButton('fav', 'Favorites'), tabButton('hist', 'History'), tabButton('plan', 'Subscription'), tabButton('set', 'Settings')
      ]),
      el('div', { role: 'tabpanel', id: 'ap-fav', 'aria-labelledby': 'at-fav' }, [favPanel()]),
      el('div', { role: 'tabpanel', id: 'ap-hist', 'aria-labelledby': 'at-hist' }, [histPanel()]),
      el('div', { role: 'tabpanel', id: 'ap-plan', 'aria-labelledby': 'at-plan' }, [planPanel()]),
      el('div', { role: 'tabpanel', id: 'ap-set', 'aria-labelledby': 'at-set' }, [settingsPanel()])
    ]);
    host.appendChild(tabs);
    if (root.VKUI && root.VKUI.initTabs) root.VKUI.initTabs(host);
    loadFavorites(); loadHistory(); loadPlan();
  }

  /* ---- Favorites ---- */
  function favPanel() { var w = el('div', { id: 'fav-wrap' }, [el('div', { class: 'vk-skeleton', style: 'height:60px' })]); return w; }
  async function loadFavorites() {
    var wrap = doc.getElementById('fav-wrap'); if (!wrap) return;
    try {
      var r = await client.from('favorites').select('tool_id, created_at').order('created_at', { ascending: false });
      var rows = (r.data || []);
      wrap.innerHTML = '';
      if (!rows.length) { wrap.appendChild(emptyState('No favorites yet', 'Open any tool and tap the ☆ to pin it here.')); return; }
      var grid = el('div', { class: 'popular-grid' });
      rows.forEach(function (row) { var t = VK && VK.find(row.tool_id); if (!t) return; var cat = VK.category(t.cat) || { name: '' }; grid.appendChild(el('a', { class: 'poptool', href: toolHref(t.id, t.cat) }, [el('span', { class: 'poptool-tx' }, [el('strong', { text: t.name }), el('span', { text: cat.name })])])); });
      wrap.appendChild(grid);
    } catch (e) { wrap.innerHTML = ''; wrap.appendChild(emptyState('Couldn’t load favorites', 'The favorites table may not be set up yet (see supabase/schema.sql).')); }
  }

  /* ---- History (cloud, a Pro convenience) ---- */
  function histPanel() { return el('div', { id: 'hist-wrap' }, [el('div', { class: 'vk-skeleton', style: 'height:60px' })]); }
  async function loadHistory() {
    var wrap = doc.getElementById('hist-wrap'); if (!wrap) return;
    try {
      var r = await client.from('history').select('tool_id, used_at').order('used_at', { ascending: false }).limit(40);
      var rows = (r.data || []);
      wrap.innerHTML = '';
      if (!rows.length) { wrap.appendChild(emptyState('No history yet', 'Tools you use while signed in show up here, synced across your devices.')); return; }
      var list = el('div', { class: 'popular-grid' });
      rows.forEach(function (row) { var t = VK && VK.find(row.tool_id); if (!t) return; list.appendChild(el('a', { class: 'poptool', href: toolHref(t.id, t.cat) }, [el('span', { class: 'poptool-tx' }, [el('strong', { text: t.name }), el('span', { text: new Date(row.used_at).toLocaleDateString() })])])); });
      wrap.appendChild(list);
    } catch (e) { wrap.innerHTML = ''; wrap.appendChild(emptyState('Couldn’t load history', 'The history table may not be set up yet (see supabase/schema.sql).')); }
  }

  /* ---- Subscription ---- */
  function planPanel() { return el('div', { id: 'plan-wrap' }, [el('div', { class: 'vk-skeleton', style: 'height:60px' })]); }
  async function loadPlan() {
    var wrap = doc.getElementById('plan-wrap'); if (!wrap) return;
    var plan = 'free';
    try { var r = await client.from('profiles').select('plan').eq('id', user.id).single(); if (r.data && r.data.plan) plan = r.data.plan; } catch (e) {}
    wrap.innerHTML = '';
    wrap.appendChild(el('div', { class: 'calc-stats' }, [el('div', { class: 'calc-stat' }, [el('span', { text: 'Current plan' }), el('b', { text: plan === 'free' ? 'Free' : plan })])]));
    if (plan === 'free') wrap.appendChild(el('p', { class: 'note', html: 'You’re on the free plan — every tool works with no limits. <a href="' + up() + 'pricing.html" style="color:var(--accent);font-weight:600">See Pro</a> for no ads, cloud history and premium tools.' }));
    else wrap.appendChild(el('p', { class: 'note', text: 'Thanks for supporting Vootkit. Manage billing from the receipt email’s Stripe portal link.' }));
  }

  /* ---- Settings ---- */
  function settingsPanel() {
    var name = el('input', { class: 'field', type: 'text', value: (user.user_metadata && user.user_metadata.display_name) || '', 'aria-label': 'Display name' });
    var pw = el('input', { class: 'field', type: 'password', placeholder: 'New password', 'aria-label': 'New password', autocomplete: 'new-password' });
    var msg = el('p', { class: 'note', role: 'status' });
    var saveName = el('button', { class: 'btn btn-primary', type: 'button', text: 'Save name', onClick: async function () { try { await client.auth.updateUser({ data: { display_name: name.value } }); toast('Name updated'); } catch (e) { toast('Could not save', 'warn'); } } });
    var savePw = el('button', { class: 'btn', type: 'button', text: 'Change password', onClick: async function () { var p = A.passwordProblem(pw.value); if (p) { toast(p, 'warn'); return; } try { await A.updatePassword(pw.value); pw.value = ''; toast('Password changed'); } catch (e) { toast('Could not change password', 'warn'); } } });
    return el('div', { class: 'wfield' }, [
      el('label', { class: 'wfield' }, [el('span', { class: 'wlab', text: 'Display name' }), name]),
      el('div', { class: 'wbtns' }, [saveName]),
      el('label', { class: 'wfield', style: 'margin-top:var(--s-4)' }, [el('span', { class: 'wlab', text: 'New password' }), pw]),
      el('div', { class: 'wbtns' }, [savePw]),
      msg,
      el('p', { class: 'note', style: 'margin-top:var(--s-5)', html: '<a href="#" style="color:var(--err);font-weight:600" onclick="return false">Delete account</a> — contact support to remove your account and data.' })
    ]);
  }

  function emptyState(title, body) { return el('div', { class: 'vk-empty' }, [el('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', html: '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3z"/>' }), el('h3', { text: title }), el('p', { class: 'note', text: body })]); }
  function toast(m, type) { if (root.VKUI && root.VKUI.toast) root.VKUI.toast(m, { type: type || 'ok' }); }

  init();
})(typeof window !== 'undefined' ? window : globalThis);
