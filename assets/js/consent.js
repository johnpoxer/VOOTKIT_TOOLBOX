/* consent.js — cookie consent + Google Consent Mode v2.
 *
 * WHY THIS EXISTS, IN REVENUE TERMS. Vootkit had no consent mechanism at all.
 * Google requires a consent solution for traffic from the EEA and UK; without
 * one, AdSense withholds personalised ads for those users, and personalised
 * inventory is worth several times contextual. The site ships hreflang for
 * de/fr/es/it/pt and reports revenue in EUR, so this is not a hypothetical
 * segment — it is a large share of the addressable audience being served the
 * cheapest possible ads.
 *
 * It is also the plain legal position under GDPR and the ePrivacy Directive:
 * analytics and advertising storage require prior consent, and GA4 has been
 * firing on every page since launch without asking.
 *
 * HOW CONSENT MODE WORKS, because getting this backwards is the usual mistake.
 * Defaults must be set BEFORE gtag('config') runs, so the signals are attached
 * to the very first hit rather than to whatever fires after the banner is
 * answered. That ordering is enforced in build.js: this file is inlined in the
 * head, above the GA4 snippet. Loading it deferred with the other scripts would
 * make it decorative.
 *
 * WHAT IS DELIBERATELY NOT HERE. This is not an IAB TCF vendor-consent
 * framework. Ezoic and Mediavine ship their own certified CMPs and, when either
 * goes live, theirs takes over and this should be switched off via
 * VK_CONFIG.consent.enabled — two consent layers on one page is a worse
 * experience and a worse legal position than either alone.
 */
(function (root) {
  'use strict';

  var KEY = 'vk-consent';
  var VERSION = 1;          // bump to re-ask everyone after a material change

  /* Regions where prior consent is required before storage. Google applies
     Consent Mode regionally, so the default is: deny in these, granted
     elsewhere. Listing them explicitly rather than trying to geolocate in the
     browser — the region parameter is Google's job and it does it server-side
     from the request, which is more accurate than anything a page can do. */
  var CONSENT_REQUIRED_REGIONS = [
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
    'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',   // EU
    'IS','LI','NO',                                                 // EEA
    'GB','CH'                                                       // UK, CH
  ];

  function read() {
    try {
      var raw = root.localStorage.getItem(KEY);
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (!v || v.v !== VERSION) return null;
      return v;
    } catch (e) { return null; }
  }

  function write(granted) {
    try {
      root.localStorage.setItem(KEY, JSON.stringify({
        v: VERSION, granted: !!granted, at: new Date().toISOString().slice(0, 10)
      }));
    } catch (e) {}
  }

  /* The Consent Mode v2 signal set. analytics_storage covers GA4;
     ad_storage / ad_user_data / ad_personalization cover AdSense. They are
     separable in the spec but there is no honest way to present that choice in
     a two-button banner, so they move together. */
  function signals(granted) {
    var v = granted ? 'granted' : 'denied';
    return {
      ad_storage: v,
      ad_user_data: v,
      ad_personalization: v,
      analytics_storage: v,
      functionality_storage: 'granted',   // theme, recent tools — strictly necessary
      security_storage: 'granted'
    };
  }

  function gtagSafe() {
    if (typeof root.gtag === 'function') return root.gtag;
    /* Consent Mode is designed to be callable before the GA4 library loads —
       the dataLayer queues it. This shim keeps that true if defaults are set
       before the snippet, which is exactly the ordering we want. */
    root.dataLayer = root.dataLayer || [];
    return function () { root.dataLayer.push(arguments); };
  }

  /* Called from the head, before gtag('config'). */
  function setDefaults() {
    var g = gtagSafe();
    var saved = read();
    if (saved) {
      /* A returning visitor who already answered: apply their answer globally
         and skip the regional default entirely. */
      g('consent', 'default', signals(saved.granted));
      return;
    }
    /* Unanswered. Deny where consent is required, grant elsewhere. Without the
       region list this would either deny worldwide (throwing away RPM in the US,
       which is most of the money) or grant worldwide (which is the violation). */
    g('consent', 'default', Object.assign(signals(false), {
      region: CONSENT_REQUIRED_REGIONS,
      wait_for_update: 500
    }));
    g('consent', 'default', signals(true));
  }

  function update(granted) {
    gtagSafe()('consent', 'update', signals(granted));
    write(granted);
  }

  root.VKConsent = {
    KEY: KEY, VERSION: VERSION,
    REGIONS: CONSENT_REQUIRED_REGIONS,
    signals: signals, read: read, write: write,
    setDefaults: setDefaults, update: update,
    needsBanner: function () { return read() === null; }
  };
  if (typeof module === 'object' && module.exports) module.exports = root.VKConsent;
})(typeof window !== 'undefined' ? window : globalThis);
