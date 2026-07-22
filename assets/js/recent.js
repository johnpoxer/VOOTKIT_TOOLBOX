/* recent.js — "recently viewed" trail. Never leave a dead end.
 * Records the current tool page and renders the user's recent tools. */
(function () {
  'use strict';
  var KEY = 'vk-recent-v1', MAX = 8;

  function read() { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v.slice(0, MAX))); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function start() {
    var ws = document.getElementById('workspace') || document.querySelector('.ws');
    var here = null;

    // identify the current tool from the canonical URL: /tools/<cat>/<id>/
    var m = location.pathname.match(/\/tools\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/);
    if (m && window.VK) {
      var tool = window.VK.find(m[2]);
      if (tool) {
        here = tool.id;
        var list = read().filter(function (x) { return x !== here; });
        list.unshift(here);
        save(list);
      }
    }

    var box = document.getElementById('recent-wrap');
    var row = document.getElementById('recent');
    if (!box || !row || !window.VK) return;

    var items = read().filter(function (id) { return id !== here; })
      .map(function (id) { return window.VK.find(id); })
      .filter(Boolean).slice(0, 6);

    if (!items.length) return;
    // depth from /tools/<cat>/<id>/ back to root
    var up = '../../../';
    row.innerHTML = items.map(function (t) {
      return '<a class="chip" href="' + up + 'tools/' + t.cat + '/' + t.id + '/">' + esc(t.name) + '</a>';
    }).join('');
    box.hidden = false;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
