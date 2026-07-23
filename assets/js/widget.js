/* widget.js — tiny shared helpers for the text/dev/everyday/data tools.
 * These tools are text-in / text-out interactive widgets, so unlike the
 * calculator and file engines they each build their own small UI. This module
 * just gives them the parts they'd otherwise reimplement: element creation,
 * copy-to-clipboard with feedback, downloads, debounce, and escaping.
 * Everything is on-device. */
(function (root) {
  'use strict';

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 120); };
  }

  function flash(btn, msg) {
    var old = btn.textContent;
    btn.textContent = msg || 'Copied';
    btn.classList.add('is-ok');
    setTimeout(function () { btn.textContent = old; btn.classList.remove('is-ok'); }, 1400);
  }

  function copy(text, btn) {
    function fallback() {
      try {
        var ta = el('textarea', { class: 'sr-only' });
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
        if (btn) flash(btn);
      } catch (e) { if (btn) flash(btn, 'Press Ctrl+C'); }
    }
    if (root.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { if (btn) flash(btn); }, fallback);
    } else fallback();
  }

  function download(content, name, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain' });
    var u = URL.createObjectURL(blob);
    var a = el('a', { href: u, download: name });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500);
  }

  /* a labelled "copy this output" button wired to a getter */
  function copyBtn(label, getText) {
    return el('button', { class: 'btn', type: 'button', text: label || 'Copy',
      onClick: function () { copy(getText(), this); } });
  }

  /* register + auto-mount: modules push their tool builders into VKW.tools,
     then call VKW.boot(). A builder is fn(host, VKW). */
  var VKW = {
    el: el, escapeHtml: escapeHtml, debounce: debounce, copy: copy,
    download: download, copyBtn: copyBtn, flash: flash, tools: {},
    boot: function () {
      var host = document.getElementById('workspace');
      if (!host || host.getAttribute('data-mounted')) return;
      var id = host.getAttribute('data-tool');
      var build = VKW.tools[id];
      if (!build) return;
      host.setAttribute('data-mounted', '1');
      host.classList.add('widget');
      build(host, VKW);
    }
  };

  root.VKW = VKW;
  if (typeof module === 'object' && module.exports) module.exports = VKW;
})(typeof window !== 'undefined' ? window : globalThis);
