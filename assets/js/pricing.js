/* pricing.js — billing toggle + Stripe Checkout hand-off.
 * Reads plan amounts from window.VK_CONFIG. The upgrade buttons call the
 * Netlify function /.netlify/functions/create-checkout, which needs the Stripe
 * secret + price IDs set as env vars (see docs/LAUNCH_CONFIG.md). */
(function () {
  'use strict';
  var CFG = window.VK_CONFIG || {};
  var plans = (CFG.stripe && CFG.stripe.plans) || {};
  var bill = 'month';

  function money(n) { return '$' + n; }

  function paintPrices() {
    var pro = bill === 'year' ? plans.creator_pro_annual : plans.creator_pro_monthly;
    var teams = bill === 'year' ? plans.creator_teams_annual : plans.creator_teams_monthly;
    var per = bill === 'year' ? '/year' : '/month';
    setText('[data-price="pro"]', pro ? money(pro.amount) : '');
    setText('[data-price="teams"]', teams ? money(teams.amount) : '');
    document.querySelectorAll('[data-per="pro"]').forEach(function (n) { n.textContent = per; });
    document.querySelectorAll('[data-per="teams"]').forEach(function (n) { n.textContent = per; });
  }
  function setText(sel, v) { var n = document.querySelector(sel); if (n && v) n.textContent = v; }

  document.querySelectorAll('[data-bill]').forEach(function (b) {
    b.addEventListener('click', function () {
      bill = b.getAttribute('data-bill');
      document.querySelectorAll('[data-bill]').forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      paintPrices();
    });
  });

  document.querySelectorAll('[data-plan]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      var key = btn.getAttribute(bill === 'year' ? 'data-plan-year' : 'data-plan-month');
      var toast = window.VKUI && window.VKUI.toast;
      var session = null;
      try { session = window.VKAuth && await window.VKAuth.getSession(); } catch (e) {}
      if (!session || !session.access_token) {
        window.location.href = 'auth/sign-in/?next=' + encodeURIComponent('/pricing.html');
        return;
      }
      /* Fired before the network call, not after. Checkout can fail — the price
         ids are still unset — and intent to pay is worth recording even when the
         attempt does not complete. A funnel that only counts successes cannot
         show you that the last step is broken. */
      try { if (window.VKTrack) window.VKTrack.beginCheckout(key); } catch (e) {}
      btn.disabled = true; var label = btn.textContent; btn.textContent = 'Redirecting…';
      try {
        var res = await fetch('/.netlify/functions/create-checkout', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token }, body: JSON.stringify({ plan: key })
        });
        var data = await res.json().catch(function () { return {}; });
        if (res.ok && data.url) { window.location.href = data.url; return; }
        throw new Error(data.error || 'Checkout is not available yet.');
      } catch (e) {
        if (toast) toast(e.message + ' Meanwhile the tools stay free.', { type: 'warn', duration: 5000 });
        else alert(e.message);
        btn.disabled = false; btn.textContent = label;
      }
    });
  });

  paintPrices();
})();
