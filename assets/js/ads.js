/* ads.js — initialise ad units only when they approach the viewport.
 *
 * WHY. Both placements sit below the article body, so on most visits they are
 * off-screen at load. Calling adsbygoogle.push() inline — the way Google's
 * copy-paste snippet does — spends main-thread time fetching, laying out and
 * painting an ad while the visitor is waiting for a PDF to merge or a 32 MB
 * video engine to download. On this site the tool IS the product; an ad that
 * competes with it for the main thread costs a run, and a run is worth more
 * than an impression.
 *
 * It also protects the metric that matters most here. Interaction to Next Paint
 * and Largest Contentful Paint are ranking signals, and this site's entire
 * strategy is organic search — so an ad implementation that degrades Core Web
 * Vitals would be paying for impressions with traffic.
 *
 * The wrapper already reserves height in CSS, so deferring the fill causes no
 * layout shift: the space is held whether the ad has arrived or not.
 *
 * 400px rootMargin: far enough that the unit is filled by the time it scrolls
 * into view (so viewability, which is what advertisers pay for, is unharmed),
 * near enough that units the visitor never reaches are never requested at all.
 */
(function (root) {
  'use strict';
  var doc = typeof document !== 'undefined' ? document : null;

  var MARGIN = '400px';
  var SEL = 'ins.adsbygoogle';

  function fill(ins) {
    if (!ins || ins.getAttribute('data-vk-filled')) return false;
    ins.setAttribute('data-vk-filled', '1');
    try {
      (root.adsbygoogle = root.adsbygoogle || []).push({});
      return true;
    } catch (e) {
      /* A blocked or absent adsbygoogle must not throw into the page. The unit
         stays as a reserved empty box, which is exactly what an ad blocker
         would have produced anyway. */
      return false;
    }
  }

  function init() {
    if (!doc) return;
    var units = doc.querySelectorAll(SEL);
    if (!units.length) return;

    /* No IntersectionObserver (old Safari, some in-app browsers): fill
       immediately rather than never. A slower page beats an unmonetised one,
       and this path is a small minority of traffic. */
    if (typeof root.IntersectionObserver !== 'function') {
      for (var i = 0; i < units.length; i++) fill(units[i]);
      return;
    }

    var io = new root.IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        fill(entries[i].target);
        io.unobserve(entries[i].target);
      }
    }, { rootMargin: MARGIN });

    for (var j = 0; j < units.length; j++) io.observe(units[j]);
  }

  function isPaidPlan(plan) { return plan === 'creator_pro'; }
  function removeUnits() {
    if (!doc) return;
    doc.querySelectorAll('.ad-slot').forEach(function (node) { node.remove(); });
  }

  function loadNetwork() {
    if (!doc || doc.querySelector('script[data-vk-ad-loaded]')) return;
    var placeholder = doc.querySelector('script[data-vk-ad-src]');
    if (!placeholder) return;
    var script = doc.createElement('script');
    script.async = true;
    script.src = placeholder.getAttribute('data-vk-ad-src');
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-vk-ad-loaded', '1');
    doc.head.appendChild(script);
  }

  async function boot() {
    var A = root.VKAuth;
    if (A && A.enabled) {
      try {
        var user = await A.getUser();
        if (user) {
          var client = await A.client();
          var result = await client.from('profiles').select('plan').eq('id', user.id).single();
          if (isPaidPlan(result && result.data && result.data.plan)) { removeUnits(); return; }
        }
      } catch (e) { /* Ads remain available if plan lookup is unavailable. */ }
    }
    loadNetwork();
    init();
  }

  root.VKAds = { fill: fill, init: init, boot: boot, loadNetwork: loadNetwork, isPaidPlan: isPaidPlan, MARGIN: MARGIN, SELECTOR: SEL };
  if (typeof module === 'object' && module.exports) module.exports = root.VKAds;
  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot(); }
})(typeof window !== 'undefined' ? window : globalThis);
