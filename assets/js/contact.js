/* contact.js — progressive-enhancement for the support form.
 * Submits to Netlify Forms over fetch so the visitor never leaves the page and
 * no mail app is opened. If JS is off, the form still POSTs normally to
 * /contact-success/ (Netlify captures it either way). */
(function () {
  'use strict';
  var f = document.getElementById('contact-form');
  if (!f) return;
  var status = document.getElementById('cf-status');
  var btn = document.getElementById('cf-submit');

  function encode(data) {
    return Object.keys(data).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
    }).join('&');
  }
  function supportEmail() {
    var e = document.querySelector('.contact-email');
    return e ? e.textContent.trim() : '';
  }

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var hp = f.querySelector('[name="bot-field"]');
    if (hp && hp.value) return; // silently drop bots

    var data = {};
    new FormData(f).forEach(function (v, k) { data[k] = v; });

    var orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending…';
    status.textContent = ''; status.className = 'cf-status';

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encode(data)
    }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      f.reset();
      status.textContent = 'Thanks! Your message has been sent — we’ll reply by email.';
      status.className = 'cf-status is-ok';
    }).catch(function () {
      var mail = supportEmail();
      status.innerHTML = 'Sorry, that didn’t send. Please try again' +
        (mail ? ', or email us directly at <strong>' + mail + '</strong>.' : '.');
      status.className = 'cf-status is-err';
    }).then(function () {
      btn.disabled = false; btn.textContent = orig;
    });
  });
})();
