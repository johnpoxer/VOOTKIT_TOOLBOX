/* contact.js - progressive enhancement for the support form.
 * Netlify captures the form when JavaScript is off; this layer adds validation,
 * useful quick links, query-param context and an in-page success state. */
(function () {
  'use strict';
  var doc = document;
  var f = doc.getElementById('contact-form');
  if (!f) return;

  var status = doc.getElementById('cf-status');
  var btn = doc.getElementById('cf-submit');
  var success = doc.getElementById('cf-success');
  var reset = doc.getElementById('cf-reset');
  var count = doc.getElementById('cf-count');
  var regarding = doc.querySelector('[data-contact-regarding]');
  var fields = {
    name: f.elements.name,
    email: f.elements.email,
    subject: f.elements.subject,
    message: f.elements.message,
    tool: f.elements.tool
  };
  var SUBJECT_MAP = {
    general: 'General Question',
    tool: 'Tool Problem',
    problem: 'Tool Problem',
    billing: 'Account & Billing',
    account: 'Account & Billing',
    bug: 'Bug Report',
    feature: 'Feature Request',
    workflow: 'Workflow',
    templates: 'Templates',
    business: 'Partnership / Business',
    partnership: 'Partnership / Business',
    privacy: 'Privacy / Security',
    security: 'Privacy / Security',
    other: 'Other'
  };
  var TOOL_LABELS = {
    'pdf-to-word': 'PDF to Word',
    'word-to-pdf': 'Word to PDF',
    'jpg-to-pdf': 'JPG to PDF',
    'pdf-to-jpg': 'PDF to JPG',
    'jpg-to-png': 'JPG to PNG',
    'png-to-jpg': 'PNG to JPG',
    'html-to-pdf': 'HTML to PDF',
    'pdf-ocr': 'PDF OCR'
  };

  function encode(data) {
    return Object.keys(data).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
    }).join('&');
  }
  function clean(v) {
    return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }
  function fieldBox(el) {
    return el ? el.closest('.cs-field') : null;
  }
  function errFor(name) {
    return doc.querySelector('[data-error-for="' + name + '"]');
  }
  function setError(name, msg) {
    var el = fields[name];
    var err = errFor(name);
    var box = fieldBox(el);
    if (err) err.textContent = msg || '';
    if (box) box.classList.toggle('is-invalid', !!msg);
    if (el) el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function clearErrors() {
    ['name', 'email', 'subject', 'message'].forEach(function (n) { setError(n, ''); });
  }
  function updateCount() {
    if (!count || !fields.message) return;
    count.textContent = String(fields.message.value.length) + ' / 1000';
  }
  function supportEmail() {
    var e = doc.querySelector('.contact-email');
    return e ? e.textContent.trim() : '';
  }
  function rateLimited() {
    var now = Date.now();
    var key = 'vk-contact-last-submit';
    var last = 0;
    try { last = Number(localStorage.getItem(key) || 0); } catch (e) {}
    if (last && now - last < 60000) return true;
    try { localStorage.setItem(key, String(now)); } catch (e) {}
    return false;
  }
  function focusForm() {
    var panel = doc.getElementById('contact-form-panel');
    if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () {
      var target = fields.subject && fields.subject.value ? fields.message : fields.name;
      if (target && target.focus) target.focus({ preventScroll: true });
    }, 280);
  }
  function setSubject(value, shouldFocus) {
    if (!fields.subject) return;
    fields.subject.value = SUBJECT_MAP[String(value || '').toLowerCase()] || value || '';
    setError('subject', '');
    if (shouldFocus) focusForm();
  }
  function titleFromToolId(id) {
    id = clean(id);
    if (!id) return '';
    if (TOOL_LABELS[id]) return TOOL_LABELS[id];
    var VK = window.VK;
    if (VK && typeof VK.find === 'function') {
      var t = VK.find(id);
      if (t && t.name) return t.name;
    }
    return id.split('-').map(function (part) {
      var up = part.toUpperCase();
      if (/^(PDF|JPG|PNG|WEBP|AVIF|HEIC|OCR|URL|HTML|CSS|JSON|CSV|AI)$/.test(up)) return up;
      return part ? part.charAt(0).toUpperCase() + part.slice(1) : '';
    }).join(' ');
  }
  function applyUrlContext() {
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
    var subject = params.get('subject');
    if (subject) setSubject(subject, false);
    var tool = params.get('tool');
    if (tool) {
      var name = titleFromToolId(tool);
      if (fields.tool) fields.tool.value = name || clean(tool);
      if (regarding && name) {
        regarding.hidden = false;
        regarding.textContent = 'Regarding: ' + name;
      }
      if (!fields.subject.value) setSubject('tool', false);
    }
  }
  function validate() {
    clearErrors();
    var first = null;
    var name = clean(fields.name && fields.name.value);
    var email = clean(fields.email && fields.email.value);
    var subject = clean(fields.subject && fields.subject.value);
    var message = String(fields.message && fields.message.value || '').trim();
    function bad(field, msg) {
      if (!first) first = fields[field];
      setError(field, msg);
    }
    if (!name) bad('name', 'Please enter your name.');
    if (!email) bad('email', 'Please enter your email address.');
    else if (!validEmail(email)) bad('email', 'Please enter a valid email address.');
    if (!subject) bad('subject', 'Please choose a subject.');
    if (!message) bad('message', 'Please enter a message.');
    else if (message.length > 1000) bad('message', 'Please keep your message under 1000 characters.');
    if (first && first.focus) first.focus();
    return !first;
  }
  function showStatus(msg, type) {
    if (!status) return;
    status.textContent = msg || '';
    status.className = 'cf-status' + (type ? ' is-' + type : '');
  }
  function collect() {
    var data = {};
    new FormData(f).forEach(function (v, k) { data[k] = clean(v); });
    return data;
  }

  if (fields.message) fields.message.addEventListener('input', updateCount);
  updateCount();
  applyUrlContext();

  doc.querySelectorAll('[data-contact-subject]').forEach(function (el) {
    el.addEventListener('click', function () { setSubject(el.getAttribute('data-contact-subject'), true); });
  });
  doc.querySelectorAll('[data-contact-focus]').forEach(function (el) {
    el.addEventListener('click', function () { focusForm(); });
  });
  ['name', 'email', 'subject', 'message'].forEach(function (name) {
    if (!fields[name]) return;
    fields[name].addEventListener('input', function () { setError(name, ''); });
    fields[name].addEventListener('change', function () { setError(name, ''); });
  });

  if (reset) reset.addEventListener('click', function () {
    if (success) success.hidden = true;
    f.hidden = false;
    f.reset();
    clearErrors();
    showStatus('', '');
    updateCount();
    applyUrlContext();
    focusForm();
  });

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var hp = f.querySelector('[name="bot-field"]');
    if (hp && hp.value) return;
    if (!validate()) return;
    if (rateLimited()) {
      showStatus('Please wait a minute before sending another message.', 'err');
      return;
    }

    var data = collect();
    var orig = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Sending...</span>';
    }
    showStatus('', '');

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encode(data)
    }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      f.hidden = true;
      if (success) success.hidden = false;
      showStatus('', '');
    }).catch(function () {
      var mail = supportEmail();
      showStatus('Sorry, that did not send. Please try again' + (mail ? ', or email us directly at ' + mail + '.' : '.'), 'err');
    }).then(function () {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    });
  });
})();
