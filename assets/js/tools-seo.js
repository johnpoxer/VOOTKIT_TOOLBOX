/* tools-seo.js — SEO & marketing tools. Pure generation, on-device.
 * Exported builders (metaTags, robotsTxt, sitemapXml, schemaJsonLd, utmUrl,
 * slugify, keywordDensity) are unit-tested in test/seo.test.js. */
(function (root) {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- builders ---------- */
  function metaTags(o) {
    o = o || {};
    var L = [];
    if (o.title) { L.push('<title>' + esc(o.title) + '</title>'); }
    if (o.description) L.push('<meta name="description" content="' + esc(o.description) + '">');
    if (o.canonical) L.push('<link rel="canonical" href="' + esc(o.canonical) + '">');
    L.push('<meta property="og:type" content="' + esc(o.ogType || 'website') + '">');
    if (o.title) L.push('<meta property="og:title" content="' + esc(o.ogTitle || o.title) + '">');
    if (o.description) L.push('<meta property="og:description" content="' + esc(o.description) + '">');
    if (o.canonical) L.push('<meta property="og:url" content="' + esc(o.canonical) + '">');
    if (o.image) L.push('<meta property="og:image" content="' + esc(o.image) + '">');
    L.push('<meta name="twitter:card" content="' + esc(o.image ? 'summary_large_image' : 'summary') + '">');
    if (o.title) L.push('<meta name="twitter:title" content="' + esc(o.ogTitle || o.title) + '">');
    if (o.description) L.push('<meta name="twitter:description" content="' + esc(o.description) + '">');
    if (o.image) L.push('<meta name="twitter:image" content="' + esc(o.image) + '">');
    return L.join('\n');
  }

  function robotsTxt(o) {
    o = o || {};
    var L = [];
    var agents = o.agents && o.agents.length ? o.agents : ['*'];
    agents.forEach(function (a) { L.push('User-agent: ' + a); });
    (o.disallow || []).forEach(function (p) { if (p.trim()) L.push('Disallow: ' + p.trim()); });
    (o.allow || []).forEach(function (p) { if (p.trim()) L.push('Allow: ' + p.trim()); });
    if (!o.disallow || !o.disallow.filter(function (x) { return x.trim(); }).length) {
      if (!o.allow || !o.allow.length) L.push('Disallow:');   // allow everything
    }
    if (o.crawlDelay) L.push('Crawl-delay: ' + o.crawlDelay);
    if (o.sitemap) L.push('', 'Sitemap: ' + o.sitemap);
    return L.join('\n');
  }

  function sitemapXml(urls, opts) {
    opts = opts || {};
    var today = new Date().toISOString().slice(0, 10);
    var body = (urls || []).map(function (u) {
      u = String(u).trim(); if (!u) return '';
      return '  <url>\n    <loc>' + esc(u) + '</loc>\n    <lastmod>' + today + '</lastmod>' +
        (opts.changefreq ? '\n    <changefreq>' + opts.changefreq + '</changefreq>' : '') +
        (opts.priority ? '\n    <priority>' + opts.priority + '</priority>' : '') + '\n  </url>';
    }).filter(Boolean).join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + '\n</urlset>';
  }

  function schemaJsonLd(type, data) {
    var obj;
    if (type === 'FAQPage') {
      obj = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: (data.faqs || []).map(function (f) { return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }; }) };
    } else if (type === 'Article') {
      obj = { '@context': 'https://schema.org', '@type': 'Article', headline: data.title, author: { '@type': 'Person', name: data.author }, datePublished: data.date, image: data.image, description: data.description };
    } else if (type === 'Product') {
      obj = { '@context': 'https://schema.org', '@type': 'Product', name: data.title, description: data.description, image: data.image, offers: { '@type': 'Offer', price: data.price, priceCurrency: data.currency || 'USD', availability: 'https://schema.org/InStock' } };
    } else if (type === 'BreadcrumbList') {
      obj = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: (data.crumbs || []).map(function (c, i) { return { '@type': 'ListItem', position: i + 1, name: c.name, item: c.url }; }) };
    } else { obj = {}; }
    return '<script type="application/ld+json">\n' + JSON.stringify(obj, null, 2) + '\n</script>';
  }

  function utmUrl(base, p) {
    p = p || {};
    if (!base) return '';
    var url, qs = [];
    ['source', 'medium', 'campaign', 'term', 'content'].forEach(function (k) {
      if (p[k]) qs.push('utm_' + k + '=' + encodeURIComponent(p[k]));
    });
    if (!qs.length) return base;
    var sep = base.indexOf('?') === -1 ? '?' : '&';
    return base + sep + qs.join('&');
  }

  function slugify(s) {
    return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s-]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function keywordDensity(s, n) {
    var stop = { the: 1, a: 1, an: 1, and: 1, or: 1, of: 1, to: 1, in: 1, is: 1, it: 1, for: 1, on: 1, with: 1, as: 1, at: 1, by: 1, be: 1, this: 1, that: 1, are: 1 };
    var words = (String(s || '').toLowerCase().match(/[a-z0-9']+/g) || []);
    var total = words.length, freq = {};
    words.forEach(function (w) { if (!stop[w]) freq[w] = (freq[w] || 0) + 1; });
    var arr = Object.keys(freq).map(function (w) { return { word: w, count: freq[w], pct: total ? freq[w] / total * 100 : 0 }; })
      .sort(function (a, b) { return b.count - a.count || a.word.localeCompare(b.word); });
    return { total: total, top: arr.slice(0, n || 20) };
  }

  /* pixel-ish width estimate for SERP truncation (Arial ~13px) */
  function pxWidth(str) { var w = 0; for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); w += c === 32 ? 4 : /[iIl.,:;'!|]/.test(str[i]) ? 3.5 : /[mwMW]/.test(str[i]) ? 11 : 7.5; } return w; }
  function truncatePx(str, maxPx) { if (pxWidth(str) <= maxPx) return str; var s = str; while (s.length && pxWidth(s + '…') > maxPx) s = s.slice(0, -1); return s.replace(/\s+\S*$/, '') + '…'; }

  /* ---------- UI ---------- */
  function fld(W, label, node, hint) { var kids = [W.el('span', { class: 'wlab', text: label }), node]; if (hint) kids.push(W.el('small', { class: 'calc-hint', text: hint })); return W.el('label', { class: 'wfield' }, kids); }
  function inp(W, ph) { return W.el('input', { class: 'field', type: 'text', placeholder: ph || '', 'aria-label': ph || 'input' }); }
  function area(W, ph, rows) { return W.el('textarea', { class: 'field wtext', rows: String(rows || 4), placeholder: ph || '', spellcheck: 'false' }); }
  function roArea(W, rows) { return W.el('textarea', { class: 'field wtext wmono', rows: String(rows || 8), readonly: 'readonly', 'aria-label': 'Generated output' }); }
  function stat(W, l, v) { return W.el('div', { class: 'calc-stat' }, [W.el('span', { text: l }), W.el('b', { text: String(v) })]); }

  var T = {

    'meta-tag-generator': function (host, W) {
      var title = inp(W, 'Page title'), desc = area(W, 'Meta description (~155 chars)', 3), url = inp(W, 'https://example.com/page'), img = inp(W, 'https://example.com/og.jpg');
      title.value = 'Free Online PDF Tools | Vootkit';
      desc.value = 'Merge, split and compress PDFs in your browser - private, fast, and watermark-free.';
      url.value = 'https://vootkit.com/tools/pdf/';
      var out = roArea(W, 12);
      var counts = W.el('div', { class: 'calc-stats' });
      function upd() {
        out.value = metaTags({ title: title.value, description: desc.value, canonical: url.value, image: img.value });
        counts.innerHTML = '';
        counts.appendChild(stat(W, 'Title length', title.value.length + ' / ~60'));
        counts.appendChild(stat(W, 'Description length', desc.value.length + ' / ~155'));
      }
      [title, desc, url, img].forEach(function (x) { x.addEventListener('input', upd); });
      host.appendChild(fld(W, 'Title', title)); host.appendChild(fld(W, 'Description', desc));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Canonical URL', url), fld(W, 'Image URL', img)]));
      host.appendChild(counts); host.appendChild(out);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy tags', function () { return out.value; })])); upd();
    },

    'serp-preview': function (host, W) {
      var title = inp(W, 'Page title'), url = inp(W, 'https://example.com/page'), desc = area(W, 'Meta description', 3);
      title.value = 'Free Online Tools That Run in Your Browser | Vootkit';
      url.value = 'https://vootkit.com/tools/';
      desc.value = 'PDF, image, video and finance tools that process files on your device with a clean Vootkit workflow.';
      var preview = W.el('div', { class: 'wserp' });
      function upd() {
        var t = truncatePx(title.value, 600), d = truncatePx(desc.value, 920);
        var u = url.value.replace(/^https?:\/\//, '').replace(/\/$/, '');
        preview.innerHTML = '<div class="wserp-url">' + W.escapeHtml(u) + '</div><div class="wserp-title">' + W.escapeHtml(t) + '</div><div class="wserp-desc">' + W.escapeHtml(d) + '</div>';
      }
      [title, url, desc].forEach(function (x) { x.addEventListener('input', upd); });
      host.appendChild(fld(W, 'Title', title, 'Google shows ~600px (~60 chars)'));
      host.appendChild(fld(W, 'URL', url));
      host.appendChild(fld(W, 'Description', desc, 'Google shows ~920px (~155 chars)'));
      host.appendChild(W.el('p', { class: 'wlab', text: 'Preview' })); host.appendChild(preview); upd();
    },

    'og-preview': function (host, W) {
      var title = inp(W, 'og:title'), desc = inp(W, 'og:description'), url = inp(W, 'https://example.com'), img = inp(W, 'https://example.com/og.jpg');
      title.value = 'Vootkit — free browser tools'; desc.value = 'Your files never leave your device.'; url.value = 'https://vootkit.com';
      var card = W.el('div', { class: 'wog' });
      function upd() {
        var domain = (url.value.replace(/^https?:\/\//, '').split('/')[0] || '').toUpperCase();
        card.innerHTML = '';
        var visual = W.el('div', { class: 'wog-img', text: img.value ? '' : '1200 × 630' });
        if (/^https?:\/\//i.test(img.value.trim())) visual.style.backgroundImage = 'url("' + img.value.trim().replace(/["\\\n\r]/g, '') + '")';
        var body = W.el('div', { class: 'wog-body' }, [
          W.el('div', { class: 'wog-dom', text: domain }), W.el('div', { class: 'wog-title', text: title.value }), W.el('div', { class: 'wog-desc', text: desc.value })
        ]);
        card.appendChild(visual); card.appendChild(body);
      }
      [title, desc, url, img].forEach(function (x) { x.addEventListener('input', upd); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Title', title), fld(W, 'Description', desc), fld(W, 'URL', url), fld(W, 'Image URL', img)]));
      host.appendChild(W.el('p', { class: 'wlab', text: 'Link preview (Facebook / LinkedIn style)' })); host.appendChild(card); upd();
      host.appendChild(W.el('p', { class: 'note', text: 'Recommended image size is 1200 × 630 (1.91:1). Platforms cache aggressively — use their debuggers to refresh after changes.' }));
    },

    'robots-generator': function (host, W) {
      var dis = area(W, 'One path per line, e.g. /admin/', 4), allow = area(W, 'One path per line (optional)', 2), sm = inp(W, 'https://example.com/sitemap.xml'), delay = W.el('input', { class: 'field', type: 'number', min: '0', placeholder: '0', 'aria-label': 'Crawl delay' });
      var out = roArea(W, 8);
      function upd() {
        out.value = robotsTxt({ disallow: dis.value.split('\n'), allow: allow.value.split('\n'), sitemap: sm.value, crawlDelay: delay.value });
      }
      [dis, allow, sm, delay].forEach(function (x) { x.addEventListener('input', upd); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Disallow paths', dis), fld(W, 'Allow paths', allow)]));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Sitemap URL', sm), fld(W, 'Crawl-delay (sec)', delay)]));
      host.appendChild(out);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy robots.txt', function () { return out.value; }), W.el('button', { class: 'btn', type: 'button', text: 'Download', onClick: function () { W.download(out.value, 'robots.txt', 'text/plain'); } })])); upd();
    },

    'sitemap-generator': function (host, W) {
      var urls = area(W, 'One URL per line…', 8);
      urls.value = 'https://example.com/\nhttps://example.com/about\nhttps://example.com/contact';
      var freq = W.el('select', { class: 'field' }); ['', 'daily', 'weekly', 'monthly', 'yearly'].forEach(function (f) { freq.appendChild(W.el('option', { value: f, text: f || '(none)' })); });
      var out = roArea(W, 10);
      var count = W.el('p', { class: 'note' });
      function upd() {
        var list = urls.value.split('\n').filter(function (x) { return x.trim(); });
        out.value = sitemapXml(list, { changefreq: freq.value });
        count.textContent = list.length + ' URL' + (list.length === 1 ? '' : 's') + ' — sitemaps allow up to 50,000.';
      }
      [urls, freq].forEach(function (x) { x.addEventListener('input', upd); });
      host.appendChild(fld(W, 'URLs', urls)); host.appendChild(fld(W, 'Change frequency', freq)); host.appendChild(count); host.appendChild(out);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy XML', function () { return out.value; }), W.el('button', { class: 'btn', type: 'button', text: 'Download', onClick: function () { W.download(out.value, 'sitemap.xml', 'application/xml'); } })])); upd();
    },

    'schema-generator': function (host, W) {
      var type = W.el('select', { class: 'field' }); [['FAQPage', 'FAQ'], ['Article', 'Article'], ['Product', 'Product'], ['BreadcrumbList', 'Breadcrumbs']].forEach(function (o) { type.appendChild(W.el('option', { value: o[0], text: o[1] })); });
      var body = W.el('div'); var out = roArea(W, 12);
      function fields() {
        body.innerHTML = '';
        var t = type.value;
        if (t === 'FAQPage') { var fa = area(W, 'Q: How? \\n A: Like this. (one Q/A pair per two lines, or use Q:/A: prefixes)', 6); body.appendChild(fld(W, 'FAQs (Q: … then A: …)', fa)); fa.addEventListener('input', function () { gen({ faqs: parseFaqs(fa.value) }); }); }
        else if (t === 'Article') { var ti = inp(W, 'Headline'), au = inp(W, 'Author'), da = inp(W, '2026-07-23'), im = inp(W, 'image URL'), de = area(W, 'description', 2); [ti, au, da, im, de].forEach(function (x) { x.addEventListener('input', function () { gen({ title: ti.value, author: au.value, date: da.value, image: im.value, description: de.value }); }); }); body.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Headline', ti), fld(W, 'Author', au), fld(W, 'Date', da), fld(W, 'Image URL', im)])); body.appendChild(fld(W, 'Description', de)); }
        else if (t === 'Product') { var pn = inp(W, 'Product name'), pd = area(W, 'description', 2), pi = inp(W, 'image URL'), pp = inp(W, '19.99'), pc = inp(W, 'USD'); [pn, pd, pi, pp, pc].forEach(function (x) { x.addEventListener('input', function () { gen({ title: pn.value, description: pd.value, image: pi.value, price: pp.value, currency: pc.value }); }); }); body.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Name', pn), fld(W, 'Image URL', pi), fld(W, 'Price', pp), fld(W, 'Currency', pc)])); body.appendChild(fld(W, 'Description', pd)); }
        else { var bc = area(W, 'Home | https://x.com/\\nBlog | https://x.com/blog (one crumb per line: Name | URL)', 5); body.appendChild(fld(W, 'Breadcrumbs (Name | URL)', bc)); bc.addEventListener('input', function () { gen({ crumbs: bc.value.split('\n').map(function (l) { var p = l.split('|'); return { name: (p[0] || '').trim(), url: (p[1] || '').trim() }; }).filter(function (c) { return c.name; }) }); }); }
        gen({});
      }
      function parseFaqs(txt) { var out = [], cur = null; txt.split('\n').forEach(function (l) { var q = l.match(/^\s*Q:\s*(.*)/i), a = l.match(/^\s*A:\s*(.*)/i); if (q) { cur = { q: q[1], a: '' }; out.push(cur); } else if (a && cur) { cur.a = a[1]; } }); return out; }
      function gen(data) { out.value = schemaJsonLd(type.value, data); }
      type.addEventListener('change', fields);
      host.appendChild(fld(W, 'Schema type', type)); host.appendChild(body); host.appendChild(out);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy JSON-LD', function () { return out.value; })])); fields();
    },

    'keyword-density': function (host, W) {
      var ta = area(W, 'Paste your page content…', 8);
      var stats = W.el('div', { class: 'wdiff' });
      var head = W.el('p', { class: 'note' });
      function upd() {
        var k = keywordDensity(ta.value, 25);
        head.textContent = k.total + ' words · top terms (stop-words excluded)';
        stats.innerHTML = '';
        k.top.forEach(function (r) {
          var warn = r.pct > 4;
          stats.appendChild(W.el('div', { class: 'wdl' + (warn ? ' wdl-del' : ''), text: r.word + '  —  ' + r.count + '× (' + r.pct.toFixed(1) + '%)' + (warn ? '  ⚠ possible stuffing' : '') }));
        });
      }
      ta.addEventListener('input', W.debounce(upd, 150));
      host.appendChild(fld(W, 'Content', ta)); host.appendChild(head); host.appendChild(stats);
      host.appendChild(W.el('p', { class: 'note', text: 'A single keyword above ~4% often reads as stuffing. Aim for natural language; density is a weak signal for modern search engines.' })); upd();
    },

    'slug-generator': function (host, W) {
      var ta = area(W, 'Paste titles — one per line…', 6);
      ta.value = 'How to Compress a PDF in 2026\n10 Best FREE Online Tools!';
      var out = roArea(W, 6);
      function upd() { out.value = ta.value.split('\n').map(function (l) { return slugify(l); }).join('\n'); }
      ta.addEventListener('input', upd);
      host.appendChild(fld(W, 'Titles', ta)); host.appendChild(fld(W, 'Slugs', out));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy slugs', function () { return out.value; })])); upd();
    },

    'utm-builder': function (host, W) {
      var base = inp(W, 'https://example.com/landing');
      var source = inp(W, 'newsletter'), medium = inp(W, 'email'), campaign = inp(W, 'summer_sale'), term = inp(W, '(optional)'), content = inp(W, '(optional)');
      var out = W.el('textarea', { class: 'field wtext wmono', rows: '3', readonly: 'readonly', 'aria-label': 'Tagged URL' });
      function upd() { out.value = utmUrl(base.value, { source: source.value, medium: medium.value, campaign: campaign.value, term: term.value, content: content.value }); }
      [base, source, medium, campaign, term, content].forEach(function (x) { x.addEventListener('input', upd); });
      host.appendChild(fld(W, 'Website URL', base));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Source *', source), fld(W, 'Medium *', medium), fld(W, 'Campaign *', campaign), fld(W, 'Term', term), fld(W, 'Content', content)]));
      host.appendChild(fld(W, 'Tagged URL', out));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy URL', function () { return out.value; })])); upd();
      host.appendChild(W.el('p', { class: 'note', text: 'Source, medium and campaign are the three Google Analytics expects. Keep values lowercase and consistent so reports don’t fragment.' }));
    }
  };

  root.VKSeo = { metaTags: metaTags, robotsTxt: robotsTxt, sitemapXml: sitemapXml, schemaJsonLd: schemaJsonLd, utmUrl: utmUrl, slugify: slugify, keywordDensity: keywordDensity, truncatePx: truncatePx, pxWidth: pxWidth };
  if (typeof module === 'object' && module.exports) module.exports = root.VKSeo;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
