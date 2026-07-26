/* tools-docs.js — template document generators (proposal, contract, resume,
 * SWOT, landing page). Each is a form -> live HTML preview -> Print (Save as
 * PDF) or Download HTML. Pure and on-device; nothing is uploaded. */
(function (root) {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nl(s) { return esc(s).replace(/\n/g, '<br>'); }
  function bullets(text) {
    var items = String(text || '').split('\n').map(function (l) { return l.replace(/^[-*]\s*/, '').trim(); }).filter(Boolean);
    return items.length ? '<ul>' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' : '';
  }
  function fld(W, l, n) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: l }), n]); }

  var CSS = 'body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#141a22;max-width:820px;margin:28px auto;padding:0 28px;line-height:1.55}' +
    'h1{font-size:30px;margin:0 0 4px}h2{font-size:17px;margin:26px 0 8px;color:#2563eb;border-bottom:1px solid #e5e7eb;padding-bottom:4px}' +
    '.muted{color:#666;font-size:14px}ul{margin:6px 0 6px 18px;padding:0}li{margin:3px 0}p{margin:6px 0}' +
    '.sign{display:flex;gap:60px;margin-top:48px}.sign div{flex:1;border-top:1px solid #333;padding-top:6px;font-size:13px;color:#555}' +
    '@media print{body{margin:0}}';
  function page(title, body) { return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + CSS + '</style></head><body>' + body + '</body></html>'; }

  function mountDoc(doc) {
    return function (host, W) {
      var inputs = {};
      doc.fields.forEach(function (f) {
        var node;
        if (f.type === 'textarea') node = W.el('textarea', { class: 'field wtext', rows: String(f.rows || 3), placeholder: f.ph || '' });
        else if (f.type === 'date') { node = W.el('input', { class: 'field', type: 'date' }); node.value = new Date().toISOString().slice(0, 10); }
        else node = W.el('input', { class: 'field', type: 'text', placeholder: f.ph || '' });
        if (f.def != null) node.value = f.def;
        inputs[f.k] = node;
      });
      var preview = W.el('iframe', { class: 'wdocframe', title: 'Document preview' });
      function gather() { var d = {}; doc.fields.forEach(function (f) { d[f.k] = inputs[f.k].value; }); return d; }
      function render() { preview.srcdoc = doc.html(gather()); }
      doc.fields.forEach(function (f) { inputs[f.k].addEventListener('input', render); host.appendChild(fld(W, f.label, inputs[f.k])); });
      host.appendChild(W.el('p', { class: 'wlab', text: 'Preview' })); host.appendChild(preview);
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Print / Save as PDF', onClick: function () { var w = window.open('', '_blank'); if (w) { w.document.write(doc.html(gather())); w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 300); } } }),
        W.el('button', { class: 'btn', type: 'button', text: 'Download HTML', onClick: function () { W.download(doc.html(gather()), doc.filename + '.html', 'text/html'); } })
      ]));
      host.appendChild(W.el('p', { class: 'note', text: 'Built entirely in your browser — nothing is uploaded. “Print / Save as PDF” opens a clean printable version.' }));
      render();
    };
  }

  var DOCS = {
    'proposal-generator': {
      filename: 'proposal',
      fields: [
        { k: 'title', label: 'Proposal title', def: 'Website Redesign Proposal' },
        { k: 'from', label: 'From (you / company)', def: 'Acme Studio' },
        { k: 'to', label: 'Prepared for (client)', def: 'Client Co.' },
        { k: 'date', label: 'Date', type: 'date' },
        { k: 'overview', label: 'Overview', type: 'textarea', rows: 3, def: 'A short summary of the problem and what you propose to deliver.' },
        { k: 'scope', label: 'Scope of work (one per line)', type: 'textarea', rows: 4, def: 'Discovery and planning\nDesign and prototyping\nBuild and launch' },
        { k: 'timeline', label: 'Timeline', type: 'textarea', rows: 2, def: '6 weeks from kickoff to launch.' },
        { k: 'pricing', label: 'Pricing', type: 'textarea', rows: 2, def: 'Fixed fee of $8,000, 50% up front.' },
        { k: 'terms', label: 'Terms', type: 'textarea', rows: 2, def: 'Two rounds of revisions included. Valid for 30 days.' }
      ],
      html: function (d) {
        return page(d.title, '<h1>' + esc(d.title) + '</h1><p class="muted">Prepared by ' + esc(d.from) + ' for ' + esc(d.to) + ' · ' + esc(d.date) + '</p>' +
          '<h2>Overview</h2><p>' + nl(d.overview) + '</p>' +
          '<h2>Scope of work</h2>' + bullets(d.scope) +
          '<h2>Timeline</h2><p>' + nl(d.timeline) + '</p>' +
          '<h2>Pricing</h2><p>' + nl(d.pricing) + '</p>' +
          '<h2>Terms</h2><p>' + nl(d.terms) + '</p>');
      }
    },
    'contract-generator': {
      filename: 'contract',
      fields: [
        { k: 'title', label: 'Agreement title', def: 'Services Agreement' },
        { k: 'p1', label: 'Party 1 (provider)', def: 'Acme Studio' },
        { k: 'p2', label: 'Party 2 (client)', def: 'Client Co.' },
        { k: 'date', label: 'Effective date', type: 'date' },
        { k: 'services', label: 'Services provided', type: 'textarea', rows: 3, def: 'The Provider will deliver the services described in the attached proposal.' },
        { k: 'payment', label: 'Payment terms', type: 'textarea', rows: 2, def: 'Fees are payable within 14 days of invoice.' },
        { k: 'term', label: 'Term & termination', type: 'textarea', rows: 2, def: 'Either party may terminate with 14 days’ written notice.' },
        { k: 'law', label: 'Governing law', def: 'England & Wales' }
      ],
      html: function (d) {
        return page(d.title, '<h1>' + esc(d.title) + '</h1><p class="muted">Effective ' + esc(d.date) + '</p>' +
          '<p>This Agreement is made between <strong>' + esc(d.p1) + '</strong> (“Provider”) and <strong>' + esc(d.p2) + '</strong> (“Client”).</p>' +
          '<h2>1. Services</h2><p>' + nl(d.services) + '</p>' +
          '<h2>2. Payment</h2><p>' + nl(d.payment) + '</p>' +
          '<h2>3. Term &amp; termination</h2><p>' + nl(d.term) + '</p>' +
          '<h2>4. Governing law</h2><p>This Agreement is governed by the laws of ' + esc(d.law) + '.</p>' +
          '<div class="sign"><div>' + esc(d.p1) + '<br>Signature / Date</div><div>' + esc(d.p2) + '<br>Signature / Date</div></div>' +
          '<p class="muted" style="margin-top:32px">This is a general template, not legal advice. Have important contracts reviewed by a qualified lawyer.</p>');
      }
    },
    'resume-builder': {
      filename: 'resume',
      fields: [
        { k: 'name', label: 'Full name', def: 'Jane Doe' },
        { k: 'role', label: 'Headline / title', def: 'Product Designer' },
        { k: 'contact', label: 'Contact line', def: 'jane@email.com · +1 555 0100 · City, Country' },
        { k: 'summary', label: 'Summary', type: 'textarea', rows: 3, def: 'Designer with 6 years building web and mobile products people love.' },
        { k: 'experience', label: 'Experience (freeform, line breaks kept)', type: 'textarea', rows: 6, def: 'Senior Designer — Acme (2022–now)\nLed redesign that lifted conversion 24%.\n\nDesigner — Studio X (2019–2022)\nShipped the mobile app from zero to 100k users.' },
        { k: 'education', label: 'Education', type: 'textarea', rows: 2, def: 'BA Design, State University (2019)' },
        { k: 'skills', label: 'Skills (comma-separated)', def: 'Figma, Prototyping, Research, HTML/CSS' }
      ],
      html: function (d) {
        var chips = String(d.skills || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return '<span style="display:inline-block;background:#eef2ff;color:#3730a3;border-radius:6px;padding:3px 10px;margin:3px 4px 0 0;font-size:13px">' + esc(s) + '</span>'; }).join('');
        return page(d.name + ' — Resume', '<h1>' + esc(d.name) + '</h1><p class="muted">' + esc(d.role) + ' · ' + esc(d.contact) + '</p>' +
          '<h2>Summary</h2><p>' + nl(d.summary) + '</p>' +
          '<h2>Experience</h2><p>' + nl(d.experience) + '</p>' +
          '<h2>Education</h2><p>' + nl(d.education) + '</p>' +
          '<h2>Skills</h2><div>' + chips + '</div>');
      }
    },
    'swot-generator': {
      filename: 'swot',
      fields: [
        { k: 'title', label: 'Title', def: 'SWOT Analysis' },
        { k: 's', label: 'Strengths (one per line)', type: 'textarea', rows: 3, def: 'Strong brand\nLoyal customers' },
        { k: 'w', label: 'Weaknesses (one per line)', type: 'textarea', rows: 3, def: 'Small team\nLimited budget' },
        { k: 'o', label: 'Opportunities (one per line)', type: 'textarea', rows: 3, def: 'New markets\nPartnerships' },
        { k: 't', label: 'Threats (one per line)', type: 'textarea', rows: 3, def: 'New competitors\nRising costs' }
      ],
      html: function (d) {
        function cell(title, color, text) { return '<div style="background:' + color + ';border-radius:10px;padding:14px 16px"><h3 style="margin:0 0 6px;font-size:15px">' + title + '</h3>' + (bullets(text) || '<p class="muted">—</p>') + '</div>'; }
        return page(d.title, '<h1>' + esc(d.title) + '</h1>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px">' +
          cell('Strengths', '#dcfce7', d.s) + cell('Weaknesses', '#fee2e2', d.w) +
          cell('Opportunities', '#dbeafe', d.o) + cell('Threats', '#fef9c3', d.t) + '</div>');
      }
    },
    'landing-page-generator': {
      filename: 'landing-page',
      fields: [
        { k: 'headline', label: 'Headline', def: 'Build something people love' },
        { k: 'sub', label: 'Subheadline', def: 'A simple, fast way to get started today — no credit card required.' },
        { k: 'cta', label: 'Button text', def: 'Get started' },
        { k: 'ctaUrl', label: 'Button link', def: '#' },
        { k: 'f1', label: 'Feature 1', def: 'Fast — up and running in minutes' },
        { k: 'f2', label: 'Feature 2', def: 'Private — your data stays yours' },
        { k: 'f3', label: 'Feature 3', def: 'Simple — no learning curve' },
        { k: 'footer', label: 'Footer text', def: '© Your Company' }
      ],
      html: function (d) {
        function feat(t) { return '<div style="flex:1;min-width:200px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px"><p style="margin:0;font-weight:600">' + esc(t) + '</p></div>'; }
        return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(d.headline) + '</title></head>' +
          '<body style="margin:0;font-family:system-ui,Segoe UI,Arial,sans-serif;color:#0f172a;background:#f8fafc">' +
          '<section style="text-align:center;padding:80px 24px;background:linear-gradient(180deg,#eef2ff,#f8fafc)">' +
          '<h1 style="font-size:42px;margin:0 0 12px;max-width:760px;margin-inline:auto">' + esc(d.headline) + '</h1>' +
          '<p style="font-size:19px;color:#475569;max-width:620px;margin:0 auto 28px">' + esc(d.sub) + '</p>' +
          '<a href="' + esc(d.ctaUrl) + '" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600">' + esc(d.cta) + '</a></section>' +
          '<section style="max-width:900px;margin:0 auto;padding:48px 24px;display:flex;gap:16px;flex-wrap:wrap">' + feat(d.f1) + feat(d.f2) + feat(d.f3) + '</section>' +
          '<footer style="text-align:center;padding:32px;color:#94a3b8;font-size:14px">' + esc(d.footer) + '</footer></body></html>';
      }
    }
  };

  var T = {};
  Object.keys(DOCS).forEach(function (id) { T[id] = mountDoc(DOCS[id]); });

  root.VKDocs = { DOCS: DOCS };
  if (typeof module === 'object' && module.exports) module.exports = DOCS;
  if (typeof root.VKW !== 'undefined') {
    Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
