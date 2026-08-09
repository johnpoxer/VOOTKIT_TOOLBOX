/* home.js — search-first discovery. The hero IS the product.
 * Links use the real IA: /tools/<cat>/<id>/ and /tools/<cat>/. */
(function () {
  'use strict';
  if (!window.VK) return;
  var VK = window.VK;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toolHref(t) { return 'tools/' + t.cat + '/' + t.id + '/'; }
  function catHref(c) { return 'tools/' + c.slug + '/'; }

  /* ---- category iconography (shared language) ---- */
  function icon(name) {
    var p = {
      file: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/>',
      image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="1.6"/><path d="m4 18 5-5 4 3 3-3 4 4"/>',
      video: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 9l4-2v10l-4-2z"/>',
      coins: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4"/>',
      shield: '<path d="M12 3 4 6v6c0 5 3.4 7.7 8 8 4.6-.3 8-3 8-8V6z"/>',
      home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
      receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
      briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
      eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
      lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      type: '<path d="M4 6h16M4 12h16M4 18h10"/>',
      palette: '<circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><path d="M12 22a3 3 0 0 0 3-3 2 2 0 0 0-2-2h-1.5a1.5 1.5 0 0 1 0-3H14a5 5 0 1 0-5-5"/>',
      code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16"/>',
      sparkles: '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3z"/><path d="M18 15l.9 2.3L21 18l-2.1.7L18 21l-.9-2.3L15 18l2.1-.7z"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (p[name] || p.file) + '</svg>';
  }

  /* ---- search ---- */
  var input = document.getElementById('q');
  var results = document.getElementById('results');
  var count = document.getElementById('qcount');
  var browse = document.getElementById('browse');
  var active = -1;

  function render(list, query) {
    active = -1;
    if (!query) { results.hidden = true; results.innerHTML = ''; count.textContent = ''; if (browse) browse.hidden = false; return; }
    if (browse) browse.hidden = true;
    results.hidden = false;
    if (!list.length) {
      results.innerHTML = '<p class="note" style="padding:var(--s-4)">No tool matches “' + esc(query) + '”. Try a simpler word — or <a href="tools/" style="color:var(--accent);font-weight:600">browse all tools</a>.</p>';
      count.textContent = 'No matches'; return;
    }
    count.textContent = list.length + (list.length === 1 ? ' tool' : ' tools');
    results.innerHTML = list.map(function (t, i) {
      var cat = VK.category(t.cat) || { name: '' };
      var soon = t.status !== 'live';
      return '<a class="res" href="' + toolHref(t) + '" role="option" id="res-' + i + '" aria-selected="false">' +
        '<span class="res-ic">' + icon(cat.icon) + '</span>' +
        '<span class="res-main"><strong>' + esc(t.name) + (soon ? ' <em class="soon">soon</em>' : '') + '</strong>' +
        '<span class="res-desc">' + esc(t.desc) + '</span></span>' +
        '<span class="res-meta"><span class="res-cat">' + esc(cat.name) + '</span></span></a>';
    }).join('');
  }
  function paintActive() {
    var items = results.querySelectorAll('.res');
    items.forEach(function (n, i) {
      var on = i === active;
      n.classList.toggle('is-active', on);
      n.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on && typeof n.scrollIntoView === 'function') { try { n.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
    });
    input.setAttribute('aria-activedescendant', active > -1 ? 'res-' + active : '');
    results.setAttribute('aria-expanded', items.length ? 'true' : 'false');
  }
  var timer;
  function run() { var q = input.value.trim(); render(q ? VK.search(q, 12) : [], q); }

  if (input && results) {
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 80); });
    input.addEventListener('keydown', function (e) {
      var items = results.querySelectorAll('.res');
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, items.length - 1); paintActive(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, -1); paintActive(); }
      else if (e.key === 'Enter') { var pick = items[active > -1 ? active : 0]; if (pick) { e.preventDefault(); window.location.href = pick.getAttribute('href'); } }
      else if (e.key === 'Escape') { input.value = ''; run(); }
    });
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); input.focus(); input.select(); }
    });
    document.querySelectorAll('[data-try]').forEach(function (b) {
      b.addEventListener('click', function () { input.value = b.dataset.try; input.focus(); run(); });
    });
  }

  /* ---- live counts ---- */
  document.querySelectorAll('[data-count="live"]').forEach(function (n) { n.textContent = VK.counts.live; });
  document.querySelectorAll('[data-count="cats"]').forEach(function (n) { n.textContent = VK.CATEGORIES.length; });

  /* ---- popular tools (curated, high-intent) ---- */
  var POPULAR = ['merge-pdf', 'compress-image', 'compress-video', 'qr-generator', 'password-generator', 'word-counter', 'currency-converter', 'json-formatter', 'background-remover', 'pdf-to-jpg'];
  var popWrap = document.getElementById('popular');
  if (popWrap) {
    var picks = POPULAR.map(function (id) { return VK.find(id); }).filter(function (t) { return t && t.status === 'live'; }).slice(0, 8);
    popWrap.innerHTML = picks.map(function (t) {
      var cat = VK.category(t.cat) || { name: '', icon: 'file' };
      return '<a class="poptool" href="' + toolHref(t) + '"><span class="poptool-ic">' + icon(cat.icon) + '</span>' +
        '<span class="poptool-tx"><strong>' + esc(t.name) + '</strong><span>' + esc(cat.name) + '</span></span></a>';
    }).join('');
  }

  /* ---- category grid ---- */
  var catGrid = document.getElementById('cats');
  if (catGrid) {
    catGrid.innerHTML = VK.CATEGORIES.map(function (cat) {
      var live = VK.byCategory(cat.slug).filter(function (t) { return t.status === 'live'; }).length;
      var total = VK.byCategory(cat.slug).length;
      return '<a class="catcard" href="' + catHref(cat) + '">' +
        '<span class="catcard-ic">' + icon(cat.icon) + '</span>' +
        '<span class="catcard-body"><h3>' + esc(cat.name) + '</h3><p>' + esc(cat.blurb) + '</p></span>' +
        '<span class="catcard-n">' + (live || total) + ' tools</span></a>';
    }).join('');
  }
})();
