/* ui.js — Vootkit shared UI primitives (the component library).
 * Loaded on every page. Provides: a site-wide command palette (⌘K / "/"),
 * toasts, modals/dialogs (focus-trapped), and progressive tabs.
 * All accessible, reduced-motion aware, and framework-free.
 * Pure helpers (upPrefix, paletteFilter) are exported for tests. */
(function (root) {
  'use strict';
  var doc = typeof document !== 'undefined' ? document : null;

  /* relative path from the current page back to the site root, so links work
     at any depth (/, /tools/, /tools/<cat>/<id>/) and offline. */
  function upPrefix(pathname) {
    var segs = String(pathname || '/').replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    if (segs.length && segs[segs.length - 1].indexOf('.') !== -1) segs.pop(); // trailing file
    return segs.length ? new Array(segs.length + 1).join('../') : '';
  }
  function paletteFilter(VK, q, limit) {
    if (!q) return [];
    return VK.search(q, limit || 8);
  }

  function el(tag, attrs, kids) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------------- Toast ---------------- */
  var toastHost = null;
  function toast(msg, opts) {
    opts = opts || {};
    if (!toastHost) { toastHost = el('div', { class: 'vk-toasts', role: 'region', 'aria-label': 'Notifications', 'aria-live': 'polite' }); doc.body.appendChild(toastHost); }
    var t = el('div', { class: 'vk-toast vk-toast--' + (opts.type || 'info') }, [
      el('span', { class: 'vk-toast-msg', text: msg }),
      el('button', { class: 'vk-toast-x', type: 'button', 'aria-label': 'Dismiss', text: '✕', onClick: function () { remove(); } })
    ]);
    toastHost.appendChild(t);
    var timer = setTimeout(remove, opts.duration || 3600);
    function remove() { clearTimeout(timer); t.classList.add('is-out'); setTimeout(function () { t.remove(); }, 200); }
    return remove;
  }

  /* ---------------- Modal / Dialog ---------------- */
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  function modal(opts) {
    opts = opts || {};
    var lastFocus = doc.activeElement;
    var titleId = 'vkm-' + Math.random().toString(36).slice(2, 8);
    var body = el('div', { class: 'vk-modal-body' });
    if (typeof opts.content === 'string') body.innerHTML = opts.content; else if (opts.content) body.appendChild(opts.content);
    var dialog = el('div', { class: 'vk-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, [
      el('div', { class: 'vk-modal-head' }, [
        el('h2', { id: titleId, class: 'vk-modal-title', text: opts.title || '' }),
        el('button', { class: 'vk-modal-x icon-btn', type: 'button', 'aria-label': 'Close', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>', onClick: close })
      ]),
      body
    ]);
    var back = el('div', { class: 'vk-backdrop', onClick: function (e) { if (e.target === back && opts.dismissible !== false) close(); } }, [dialog]);
    function onKey(e) { if (e.key === 'Escape' && opts.dismissible !== false) close(); else if (e.key === 'Tab') trap(e); }
    function trap(e) {
      var f = dialog.querySelectorAll(FOCUSABLE); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function close() { doc.removeEventListener('keydown', onKey); back.classList.add('is-out'); setTimeout(function () { back.remove(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }, 180); if (opts.onClose) opts.onClose(); }
    doc.body.appendChild(back);
    doc.addEventListener('keydown', onKey);
    var target = dialog.querySelector(FOCUSABLE); if (target) target.focus();
    return { close: close, el: dialog };
  }

  /* ---------------- Tabs (progressive enhancement of [data-tabs]) ---------------- */
  function initTabs(scope) {
    (scope || doc).querySelectorAll('[data-tabs]').forEach(function (wrap) {
      if (wrap.__vkTabs) return; wrap.__vkTabs = 1;
      var tabs = [].slice.call(wrap.querySelectorAll('[role="tab"]'));
      var panels = [].slice.call(wrap.querySelectorAll('[role="tabpanel"]'));
      function activate(i) {
        tabs.forEach(function (t, j) { var on = j === i; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; if (panels[j]) panels[j].hidden = !on; });
      }
      tabs.forEach(function (t, i) {
        t.addEventListener('click', function () { activate(i); t.focus(); });
        t.addEventListener('keydown', function (e) {
          var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
          if (n == null) return; e.preventDefault(); n = (n + tabs.length) % tabs.length; activate(n); tabs[n].focus();
        });
      });
      activate(0);
    });
  }

  /* ---------------- Command palette (site-wide ⌘K / "/") ---------------- */
  function commandPalette() {
    var VK = root.VK; if (!VK || !doc) return;
    var loc = root.location || { pathname: '/', href: '' };
    var up = upPrefix(loc.pathname);
    var open = false, box, input, list, active = -1, current = [];

    function build() {
      input = el('input', { class: 'vk-cmd-input', type: 'search', autocomplete: 'off', 'aria-label': 'Search tools', 'aria-controls': 'vk-cmd-list', 'aria-expanded': 'true', role: 'combobox', 'aria-autocomplete': 'list', placeholder: 'Search ' + VK.counts.live + ' tools…' });
      list = el('div', { class: 'vk-cmd-list', id: 'vk-cmd-list', role: 'listbox' });
      var panel = el('div', { class: 'vk-cmd', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Command palette' }, [
        el('div', { class: 'vk-cmd-top' }, [
          el('svg', { class: 'vk-cmd-ic', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round', html: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>' }),
          input,
          el('kbd', { class: 'vk-cmd-esc', text: 'esc' })
        ]),
        list
      ]);
      box = el('div', { class: 'vk-backdrop vk-cmd-back', onClick: function (e) { if (e.target === box) close(); } }, [panel]);
      input.addEventListener('input', run);
      input.addEventListener('keydown', onKey);
      doc.body.appendChild(box);
    }
    function render() {
      if (!current.length) {
        list.innerHTML = input.value.trim()
          ? '<p class="vk-cmd-empty">No tool matches “' + esc(input.value.trim()) + '”. <a href="' + up + 'tools/">Browse all tools</a></p>'
          : '<p class="vk-cmd-hint">Type to search — or <a href="' + up + 'tools/">browse all tools</a>. Try “pdf”, “password”, “discord”.</p>';
        return;
      }
      list.innerHTML = current.map(function (t, i) {
        var cat = VK.category(t.cat) || { name: '' };
        var soon = t.status !== 'live';
        return '<a class="vk-cmd-item" role="option" id="vk-cmd-o' + i + '" aria-selected="false" href="' + up + 'tools/' + t.cat + '/' + t.id + '/">' +
          '<span class="vk-cmd-name">' + esc(t.name) + (soon ? ' <em class="soon">soon</em>' : '') + '</span>' +
          '<span class="vk-cmd-cat">' + esc(cat.name) + '</span></a>';
      }).join('');
    }
    function run() { current = paletteFilter(VK, input.value.trim(), 8); active = -1; render(); paint(); }
    function paint() {
      var items = list.querySelectorAll('.vk-cmd-item');
      items.forEach(function (n, i) { var on = i === active; n.classList.toggle('is-active', on); n.setAttribute('aria-selected', on ? 'true' : 'false'); if (on) { try { n.scrollIntoView({ block: 'nearest' }); } catch (e) {} } });
      input.setAttribute('aria-activedescendant', active > -1 ? 'vk-cmd-o' + active : '');
    }
    function onKey(e) {
      var items = list.querySelectorAll('.vk-cmd-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, items.length - 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, -1); paint(); }
      else if (e.key === 'Enter') { var pick = items[active > -1 ? active : 0]; if (pick) { e.preventDefault(); location.href = pick.getAttribute('href'); } }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    }
    function openPalette() { if (open) return; if (!box) build(); open = true; box.classList.add('is-open'); input.value = ''; run(); setTimeout(function () { input.focus(); }, 20); }
    function close() { open = false; if (box) box.classList.remove('is-open'); }

    doc.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open ? close() : openPalette(); }
      else if (e.key === '/' && !typing && !open) {
        // don't hijack the homepage's own hero search
        if (doc.getElementById('q')) return;
        e.preventDefault(); openPalette();
      }
    });
    root.VKUI = root.VKUI || {}; root.VKUI.openPalette = openPalette;
  }

  var VKUI = { toast: toast, modal: modal, initTabs: initTabs, upPrefix: upPrefix, paletteFilter: paletteFilter };
  root.VKUI = Object.assign(root.VKUI || {}, VKUI);
  if (typeof module === 'object' && module.exports) module.exports = VKUI;

  if (doc) {
    function boot() { initTabs(); commandPalette(); }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
