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
    /* Routed through VKDeliver — see the note in filetool.js. Widget tools were
       previously invisible to tool_download entirely. */
    if (root.VKDeliver && root.VKDeliver.deliver) {
      var ws = document.getElementById('workspace');
      root.VKDeliver.deliver(blob, name, { toolId: ws && ws.getAttribute('data-tool'), host: ws });
      noteSuccess();
      return;
    }
    var u = URL.createObjectURL(blob);
    var a = el('a', { href: u, download: name });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500);
    // A download from a widget tool is the same "user got what they came for"
    // moment the file tools have. Central hook so every widget tool that uses
    // this helper is covered without touching each one.
    noteSuccess();
  }

  /* Shared success signal for the conversion prompt. Safe to call more than
     once — convert.js dedupes and never renders a second card. */
  function noteSuccess() {
    try {
      var host = document.getElementById('workspace');
      if (host && root.VKConvert) root.VKConvert.onToolSuccess(host, host.getAttribute('data-tool'));
      if (host && typeof root.CustomEvent === 'function') {
        host.dispatchEvent(new root.CustomEvent('vk:widget-success', { detail: { message: 'Your result is ready.' } }));
      }
    } catch (e) { /* conversion must never break a working tool */ }
  }

  /* Give custom async widgets the same honest process states as file tools.
     This observes status text the tool already emits, so it never invents a
     delay or claims that work is happening when it is not. */
  function enhanceLifecycle(host) {
    if (!host || host.getAttribute('data-lifecycle')) return;
    host.setAttribute('data-lifecycle', '1');

    var shell = el('div', { class: 'uw-lifecycle', 'aria-live': 'polite' });
    var loading = el('section', { class: 'uw-state uw-loading', hidden: '' }, [
      el('div', { class: 'uw-spinner', role: 'progressbar', 'aria-label': 'Processing' }),
      el('h2', { text: 'Working on your result' }),
      el('p', { class: 'uw-message', text: 'Preparing…' }),
      el('ol', { class: 'uw-steps' }, [
        el('li', { class: 'is-done', text: 'Input received' }),
        el('li', { class: 'is-active', text: 'Processing' }),
        el('li', { text: 'Preparing result' })
      ])
    ]);
    var success = el('section', { class: 'uw-state uw-success', hidden: '' }, [
      el('div', { class: 'uw-check', 'aria-hidden': 'true', text: '✓' }),
      el('h2', { text: 'Your result is ready' }),
      el('p', { text: 'The tool finished successfully.' }),
      el('button', { class: 'btn ghost', type: 'button', text: 'Start over', onClick: function () { root.location.reload(); } })
    ]);
    var failure = el('section', { class: 'uw-state uw-error', hidden: '' }, [
      el('div', { class: 'uw-error-mark', 'aria-hidden': 'true', text: '!' }),
      el('h2', { text: 'We couldn\'t finish that' }),
      el('p', { text: 'Review the message below, then try again.' }),
      el('button', { class: 'btn ghost', type: 'button', text: 'Try again', onClick: function () { root.location.reload(); } })
    ]);
    shell.appendChild(loading); shell.appendChild(success); shell.appendChild(failure);
    host.insertBefore(shell, host.firstChild);

    var busyWords = /\b(loading|reading|processing|compressing|converting|extracting|scanning|rendering|generating|removing|hashing|analysing|analyzing|checking|building|shortening|uploading|transcribing|recording)\b/i;
    var doneWords = /\b(done|ready|downloaded|complete|completed|created|converted|compressed|compared|generated|recorded|finished|saved|success)\b/i;
    var notDone = /\b(choose|select|set|then|first|when|once)\b/i;
    var scheduled = false;

    function setVisible(node, visible) {
      if (node.hidden === visible) node.hidden = !visible;
    }
    function evaluate() {
      var nodes = host.querySelectorAll('[role="status"], .note, .cf-status');
      var active = '', completed = '', errored = '';
      Array.prototype.forEach.call(nodes, function (node) {
        if (shell.contains(node) || node.hidden) return;
        var message = (node.textContent || '').replace(/\s+/g, ' ').trim();
        if (!message) return;
        if (/\b(err|error|failed|failure)\b/i.test(node.className || '') || /\b(error|failed|could not|unable to)\b/i.test(message)) errored = message;
        else if (busyWords.test(message)) active = message;
        else if (doneWords.test(message) && !notDone.test(message)) completed = message;
      });
      if (errored) {
        failure.querySelector('p').textContent = errored;
        setVisible(loading, false); setVisible(success, false); setVisible(failure, true);
        host.classList.remove('widget-is-loading'); host.removeAttribute('aria-busy');
      } else if (active) {
        loading.querySelector('.uw-message').textContent = active;
        setVisible(loading, true); setVisible(success, false); setVisible(failure, false);
        host.classList.add('widget-is-loading'); host.setAttribute('aria-busy', 'true');
      } else {
        setVisible(loading, false); setVisible(failure, false);
        if (completed) setVisible(success, true);
        host.classList.remove('widget-is-loading'); host.removeAttribute('aria-busy');
      }
    }
    function schedule() {
      if (scheduled) return;
      scheduled = true;
      Promise.resolve().then(function () { scheduled = false; evaluate(); });
    }
    host.addEventListener('vk:widget-success', function (event) {
      if (event.detail && event.detail.message) success.querySelector('p').textContent = event.detail.message;
      setVisible(loading, false); setVisible(failure, false); setVisible(success, true);
      host.classList.remove('widget-is-loading'); host.removeAttribute('aria-busy');
    });
    if (root.MutationObserver) new root.MutationObserver(schedule).observe(host, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    schedule();
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
    download: download, copyBtn: copyBtn, flash: flash, noteSuccess: noteSuccess,
    enhanceLifecycle: enhanceLifecycle, tools: {},
    boot: function () {
      var host = document.getElementById('workspace');
      if (!host || host.getAttribute('data-mounted')) return;
      var id = host.getAttribute('data-tool');
      var build = VKW.tools[id];
      if (!build) return;
      host.setAttribute('data-mounted', '1');
      host.classList.add('widget');
      build(host, VKW);
      enhanceLifecycle(host);
    }
  };

  root.VKW = VKW;
  if (typeof module === 'object' && module.exports) module.exports = VKW;
})(typeof window !== 'undefined' ? window : globalThis);
