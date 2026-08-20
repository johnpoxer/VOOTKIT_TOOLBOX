/* tools-currency.js — currency-converter. This is the one NETWORK tool: it
 * fetches live exchange rates from a free, no-key public API in your browser.
 * It's honestly badged "uses an API" — unlike the file tools, a rate lookup
 * genuinely can't be done offline. No account, no tracking. */
(function (root) {
  'use strict';

  var API = 'https://open.er-api.com/v6/latest/';   // free, no key, CORS-enabled
  var CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'NGN', 'ZAR', 'BRL', 'MXN', 'SGD', 'HKD', 'SEK', 'NOK', 'NZD', 'KRW', 'AED'];
  var cache = {};   // base -> { time, rates }

  async function getRates(base) {
    var c = cache[base];
    if (c && Date.now() - c.time < 60 * 60 * 1000) return c.rates;   // 1h cache
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 12000) : null;
    var res;
    try { res = await fetch(API + encodeURIComponent(base), ctl ? { signal: ctl.signal } : undefined); }
    catch (e) { throw new Error(e && e.name === 'AbortError' ? 'The rate service took too long — please try again.' : 'Could not reach the rate service. Check your connection and try again.'); }
    finally { if (timer) clearTimeout(timer); }
    if (!res.ok) throw new Error('Rate service is unavailable right now — try again shortly.');
    var data = await res.json();
    if (!data || data.result === 'error' || !data.rates) throw new Error('Could not read exchange rates.');
    cache[base] = { time: Date.now(), rates: data.rates, updated: data.time_last_update_utc };
    return data.rates;
  }

  function fld(W, l, n) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: l }), n]); }
  function sel(W, val) { var s = W.el('select', { class: 'field' }); CURRENCIES.forEach(function (c) { s.appendChild(W.el('option', { value: c, text: c })); }); s.value = val; return s; }

  var T = {
    'currency-converter': function (host, W) {
      var amount = W.el('input', { class: 'field', type: 'number', value: '100', min: '0', step: 'any', 'aria-label': 'Amount' });
      var from = sel(W, 'USD'), to = sel(W, 'EUR');
      var out = W.el('div', { class: 'calc-headline' });
      var meta = W.el('p', { class: 'note' });
      var busy = false;
      async function convert() {
        if (busy) return; busy = true;
        host.setAttribute('aria-busy', 'true');
        out.innerHTML = '<span class="calc-label">Converting…</span>';
        try {
          var rates = await getRates(from.value);
          var rate = rates[to.value];
          if (!rate) throw new Error('Unsupported currency pair.');
          var result = (+amount.value || 0) * rate;
          out.innerHTML = '<span class="calc-label">' + (+amount.value || 0).toLocaleString() + ' ' + from.value + ' =</span><strong class="calc-value">' + result.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ' + to.value + '</strong>';
          meta.className = 'note'; meta.textContent = '1 ' + from.value + ' = ' + rate.toFixed(4) + ' ' + to.value + (cache[from.value] && cache[from.value].updated ? ' · rates updated ' + cache[from.value].updated : '');
          W.noteSuccess();
        } catch (e) { out.innerHTML = ''; meta.className = 'note err'; meta.textContent = e.message; }
        busy = false; host.removeAttribute('aria-busy');
      }
      amount.addEventListener('input', W.debounce(convert, 250));
      from.addEventListener('change', convert); to.addEventListener('change', convert);
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn', type: 'button', text: '⇅ Swap', onClick: function () { var t = from.value; from.value = to.value; to.value = t; convert(); } })
      ]));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Amount', amount), fld(W, 'From', from), fld(W, 'To', to)]));
      host.appendChild(out); host.appendChild(meta);
      host.appendChild(W.el('p', { class: 'note', text: 'This tool fetches live mid-market rates from a free public API — the only Vootkit tool that needs the network. Rates are indicative and exclude any bank/card margin. No account or key required.' }));
      convert();
    }
  };

  root.VKCurrency = { CURRENCIES: CURRENCIES };
  if (typeof module === 'object' && module.exports) module.exports = root.VKCurrency;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
