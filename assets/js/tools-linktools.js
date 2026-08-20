/* tools-linktools.js — server-backed link tools (URL shortener).
 * Talks to /.netlify/functions/create-link. Degrades to a clear message if the
 * backend isn't configured yet. */
(function (root) {
  'use strict';
  var doc = typeof document !== 'undefined' ? document : null;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function boot() {
    var host = doc.getElementById('workspace');
    if (!host || host.getAttribute('data-tool') !== 'url-shortener') return;
    if (host.querySelector('.lk-form')) return;

    host.innerHTML =
      '<form class="lk-form" autocomplete="off">' +
        '<label class="cf-field"><span class="cf-lab">Long URL</span>' +
          '<input class="field" id="lk-url" type="url" inputmode="url" placeholder="https://example.com/a/very/long/link" required></label>' +
        '<label class="cf-field"><span class="cf-lab">Custom name (optional)</span>' +
          '<div class="lk-alias"><span class="lk-prefix">vootkit.com/s/</span>' +
          '<input class="field" id="lk-alias" type="text" placeholder="my-link" maxlength="32" pattern="[A-Za-z0-9\\- ]*"></div></label>' +
        '<div class="cf-actions"><button class="btn btn-primary" type="submit" id="lk-go">Shorten URL</button>' +
          '<span class="cf-status" id="lk-status" role="status" aria-live="polite"></span></div>' +
      '</form>' +
      '<div id="lk-result" hidden></div>';

    var form = host.querySelector('.lk-form');
    var status = doc.getElementById('lk-status');
    var btn = doc.getElementById('lk-go');
    var result = doc.getElementById('lk-result');
    if (root.VKW && root.VKW.enhanceLifecycle) root.VKW.enhanceLifecycle(host);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var url = doc.getElementById('lk-url').value.trim();
      var alias = doc.getElementById('lk-alias').value.trim();
      if (!url) return;
      btn.disabled = true; var orig = btn.textContent; btn.textContent = 'Shortening…';
      status.textContent = ''; status.className = 'cf-status'; result.hidden = true;
      host.setAttribute('aria-busy', 'true');
      try {
        var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timer = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : null;
        var res = await fetch('/.netlify/functions/create-link', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url, alias: alias }), signal: ctl ? ctl.signal : undefined
        });
        if (timer) clearTimeout(timer);
        var data = await res.json().catch(function () { return {}; });
        if (res.ok && data.shortUrl) {
          result.hidden = false;
          result.innerHTML =
            '<div class="lk-out"><span class="cf-lab">Your short link</span>' +
            '<div class="lk-row"><a class="lk-short" href="' + esc(data.shortUrl) + '" target="_blank" rel="noopener">' + esc(data.shortUrl) + '</a>' +
            '<button class="btn btn-sm" type="button" id="lk-copy">Copy</button></div></div>';
          var copy = doc.getElementById('lk-copy');
          copy.addEventListener('click', function () {
            (navigator.clipboard ? navigator.clipboard.writeText(data.shortUrl) : Promise.reject())
              .then(function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy'; }, 1500); })
              .catch(function () {});
          });
          status.textContent = 'Short link ready.'; status.className = 'cf-status is-ok';
          if (root.VKConvert) root.VKConvert.onToolSuccess(host, 'url-shortener');
          if (typeof root.CustomEvent === 'function') host.dispatchEvent(new root.CustomEvent('vk:widget-success', { detail: { message: 'Your short link is ready.' } }));
        } else {
          throw new Error(data.error || 'Could not shorten that link.');
        }
      } catch (err) {
        status.textContent = err && err.name === 'AbortError' ? 'The request took too long. Check your connection and try again.' : (err.message || 'Something went wrong. Please try again.');
        status.className = 'cf-status is-err';
      } finally {
        btn.disabled = false; btn.textContent = orig; host.removeAttribute('aria-busy');
      }
    });

    // if someone landed here from a dead short link
    try {
      var e2 = new URLSearchParams(root.location.search).get('e');
      if (e2 === 'notfound') { status.textContent = 'That short link wasn’t found — it may never have existed.'; status.className = 'cf-status is-err'; }
      else if (e2 === 'error') { status.textContent = 'That short link couldn’t be opened. Please try again.'; status.className = 'cf-status is-err'; }
    } catch (e) {}
  }

  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot(); }
})(typeof window !== 'undefined' ? window : globalThis);
