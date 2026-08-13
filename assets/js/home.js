/* home.js - dynamic discovery for the hand-authored homepage. */
(function () {
  'use strict';
  if (!window.VK) return;
  var VK = window.VK;
  var STATS = window.VK_STATS || {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function toolHref(t) { return 'tools/' + t.cat + '/' + t.id + '/'; }
  function catHref(c) { return 'tools/' + c.slug + '/'; }
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function liveTool(t) { return t && t.status === 'live'; }
  function one(id) { return VK.find(id); }
  function floorTo(n, step) {
    return Math.max(step, Math.floor(Number(n || 0) / step) * step);
  }
  function toolsDisplayValue() {
    return floorTo(VK.counts.live, (STATS.tools && STATS.tools.roundTo) || 50);
  }
  function metricValue(key) {
    if (key === 'tools') return toolsDisplayValue();
    var audience = STATS.audience || {};
    return audience[key] && audience[key].value;
  }
  function metricDisplay(key) {
    if (key === 'tools') return String(toolsDisplayValue());
    var audience = STATS.audience || {};
    return audience[key] && String(audience[key].display);
  }
  function formatMetric(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n % 1000 ? 1 : 0).replace(/\.0$/, '') + 'K';
    return String(Math.round(n));
  }
  function animateMetric(node) {
    var key = node.getAttribute('data-metric');
    var finalValue = Number(metricValue(key) || 0);
    var finalText = metricDisplay(key) || node.textContent;
    if (!finalValue || node.dataset.counted === '1') {
      node.textContent = finalText;
      return;
    }
    node.dataset.counted = '1';
    var parent = node.closest('.global-stat');
    if (parent) parent.classList.add('is-counting');
    var start = performance.now();
    var duration = 900;
    function tick(now) {
      var t = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      node.textContent = formatMetric(finalValue * eased) + (finalText.indexOf('+') !== -1 ? '+' : '');
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        node.textContent = finalText;
        if (parent) parent.classList.remove('is-counting');
      }
    }
    requestAnimationFrame(tick);
  }
  function uniqTools(list) {
    var seen = {};
    return list.filter(function (t) {
      if (!t || seen[t.id]) return false;
      seen[t.id] = true;
      return true;
    });
  }

  function icon(name) {
    var p = {
      file: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/>',
      image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="1.6"/><path d="m4 18 5-5 4 3 3-3 4 4"/>',
      video: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 9l4-2v10l-4-2z"/>',
      coins: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4"/>',
      shield: '<path d="M12 3 4 6v6c0 5 3.4 7.7 8 8 4.6-.3 8-3 8-8V6z"/>',
      home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
      receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
      briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
      eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
      lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      type: '<path d="M4 6h16M4 12h16M4 18h10"/>',
      palette: '<circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><path d="M12 22a3 3 0 0 0 3-3 2 2 0 0 0-2-2h-1.5a1.5 1.5 0 0 1 0-3H14a5 5 0 1 0-5-5"/>',
      code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16"/>',
      sparkles: '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3z"/><path d="M18 15l.9 2.3L21 18l-2.1.7L18 21l-.9-2.3L15 18l2.1-.7z"/>',
      heart: '<path d="M20.8 4.6a5.2 5.2 0 0 0-7.4 0L12 6l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 20.8l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z"/>',
      plane: '<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/>',
      mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v3"/>',
      book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5z"/><path d="M8 7h8M8 11h8"/>',
      grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (p[name] || p.file) + '</svg>';
  }

  function toolIc(t) {
    var D = window.VK_ICONS;
    var e = D && D.icons && D.icons[t.id];
    if (!e || !D.glyphs[e.g]) {
      var c = VK.category(t.cat) || { icon: 'file' };
      return '<span class="ic">' + icon(c.icon) + '</span>';
    }
    return '<span class="ic ic-tool" style="--ic-h:' + e.h + ';--ic-bg:' + e.bg + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + D.glyphs[e.g] + '</svg></span>';
  }

  var INTENTS = [
    { ids: ['compress-pdf'], test: function (n) { return /\bpdf\b/.test(n) && /(compress|shrink|smaller|reduce|size|mb|kb|email|upload|limit)/.test(n); } },
    { ids: ['merge-pdf'], test: function (n) { return /\bpdf\b/.test(n) && /(merge|join|combine|together)/.test(n); } },
    { ids: ['split-pdf'], test: function (n) { return /\bpdf\b/.test(n) && /(split|separate|extract page|pull page)/.test(n); } },
    { ids: ['pdf-to-jpg', 'pdf-to-png', 'pdf-to-webp'], test: function (n) { return /\bpdf\b/.test(n) && /(image|jpg|jpeg|png|webp|picture|photo)/.test(n); } },
    { ids: ['word-to-pdf'], test: function (n) { return /(word|docx|document)/.test(n) && /\bpdf\b/.test(n); } },
    { ids: ['compress-image'], test: function (n) { return /(image|photo|picture|jpg|jpeg|png|webp)/.test(n) && /(compress|shrink|smaller|reduce|size)/.test(n); } },
    { ids: ['resize-image', 'bulk-resize'], test: function (n) { return /(image|photo|picture|jpg|jpeg|png|webp)/.test(n) && /(resize|dimensions|width|height|scale)/.test(n); } },
    { ids: ['heic-converter'], test: function (n) { return /(heic|heif|iphone photo)/.test(n); } },
    { ids: ['png-to-jpg', 'jpg-to-png', 'webp-to-jpg', 'webp-to-png', 'convert-image'], test: function (n) { return /(jpg|jpeg|png|webp|image|photo)/.test(n) && /(convert|change|format|to jpg|to png|to webp)/.test(n); } },
    { ids: ['compress-video'], test: function (n) { return /(video|mp4|mov|clip|discord|whatsapp|email)/.test(n) && /(compress|shrink|smaller|reduce|size|limit)/.test(n); } },
    { ids: ['convert-video'], test: function (n) { return /(video|mp4|mov|mkv|avi|webm)/.test(n) && /(convert|format|to mp4)/.test(n); } },
    { ids: ['trim-video'], test: function (n) { return /(video|clip|mp4|mov)/.test(n) && /(trim|cut|shorten|crop time)/.test(n); } },
    { ids: ['json-formatter'], test: function (n) { return /json/.test(n) && /(format|beautify|pretty|validate|minify)/.test(n); } },
    { ids: ['password-generator'], test: function (n) { return /(password|passphrase)/.test(n) && /(make|generate|random|secure|strong)/.test(n); } },
    { ids: ['qr-generator'], test: function (n) { return /\bqr\b|qr code|barcode/.test(n) && /(make|create|generate|link|text)/.test(n); } },
    { ids: ['mortgage-calculator', 'loan-calculator'], test: function (n) { return /(mortgage|loan|payment|repayment|interest|amortization)/.test(n); } },
    { ids: ['invoice-generator', 'quote-generator', 'receipt-generator'], test: function (n) { return /(invoice|quote|estimate|receipt|bill client)/.test(n); } },
    { ids: ['resume-builder'], test: function (n) { return /(resume|cv|job application)/.test(n); } }
  ];

  function searchTools(query, limit) {
    var n = norm(query);
    if (!n) return [];
    var intent = [];
    INTENTS.forEach(function (rule) {
      if (rule.test(n)) rule.ids.forEach(function (id) { intent.push(one(id)); });
    });
    return uniqTools(intent.concat(VK.search(query, 24)))
      .filter(liveTool)
      .slice(0, limit || 12);
  }

  var input = document.getElementById('q');
  var results = document.getElementById('results');
  var count = document.getElementById('qcount');
  var browse = document.getElementById('browse');
  var active = -1;

  function setExpanded(on) {
    if (input) input.setAttribute('aria-expanded', on ? 'true' : 'false');
  }

  function render(list, query) {
    active = -1;
    if (!query) {
      results.hidden = true;
      results.innerHTML = '';
      count.textContent = '';
      setExpanded(false);
      if (browse) browse.hidden = false;
      return;
    }
    if (browse) browse.hidden = true;
    results.hidden = false;
    setExpanded(true);
    if (!list.length) {
      results.innerHTML = '<p class="note search-empty">No live tool matches "' + esc(query) + '". Try a simpler word, or <a href="tools/">browse all tools</a>.</p>';
      count.textContent = 'No matches';
      return;
    }
    count.textContent = list.length + (list.length === 1 ? ' tool' : ' tools');
    results.innerHTML = list.map(function (t, i) {
      var cat = VK.category(t.cat) || { name: '' };
      return '<a class="res" href="' + toolHref(t) + '" role="option" id="res-' + i + '" aria-selected="false">' +
        toolIc(t) +
        '<span class="res-main"><strong>' + esc(t.name) + '</strong>' +
        '<span class="res-desc">' + esc(t.desc) + '</span></span>' +
        '<span class="res-meta"><span class="res-cat">' + esc(cat.name) + '</span></span></a>';
    }).join('');
  }

  function paintActive() {
    var items = results.querySelectorAll('.res');
    items.forEach(function (n, i) {
      var on = i === active;
      n.classList.toggle('is-active', on);
      n.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on && typeof n.scrollIntoView === 'function') {
        try { n.scrollIntoView({ block: 'nearest' }); } catch (e) {}
      }
    });
    input.setAttribute('aria-activedescendant', active > -1 ? 'res-' + active : '');
  }

  var timer;
  function run() {
    var q = input.value.trim();
    render(q ? searchTools(q, 12) : [], q);
  }

  if (input && results) {
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 70); });
    input.addEventListener('keydown', function (e) {
      var items = results.querySelectorAll('.res');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        active = Math.min(active + 1, items.length - 1);
        paintActive();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        active = Math.max(active - 1, -1);
        paintActive();
      } else if (e.key === 'Enter') {
        var pick = items[active > -1 ? active : 0];
        if (pick) { e.preventDefault(); window.location.href = pick.getAttribute('href'); }
      } else if (e.key === 'Escape') {
        input.value = '';
        run();
      }
    });
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
    document.querySelectorAll('[data-try]').forEach(function (b) {
      b.addEventListener('click', function () {
        input.value = b.dataset.try;
        input.focus();
        run();
      });
    });
  }

  document.querySelectorAll('[data-count="live"]').forEach(function (n) { n.textContent = VK.counts.live; });
  document.querySelectorAll('[data-count="live-rounded"]').forEach(function (n) { n.textContent = toolsDisplayValue(); });
  document.querySelectorAll('[data-count="cats"]').forEach(function (n) { n.textContent = VK.CATEGORIES.length; });
  Object.keys((STATS.audience || {})).forEach(function (key) {
    document.querySelectorAll('[data-stat="' + key + '"]').forEach(function (node) {
      node.textContent = STATS.audience[key].display || node.textContent;
    });
  });

  var POPULAR = [
    'compress-pdf', 'merge-pdf', 'compress-image', 'resize-image',
    'compress-video', 'convert-video', 'word-to-pdf', 'pdf-to-jpg',
    'json-formatter', 'qr-generator', 'invoice-generator', 'password-generator'
  ];
  var popWrap = document.getElementById('popular');
  if (popWrap) {
    var picks = POPULAR.map(one).filter(liveTool);
    popWrap.innerHTML = picks.map(function (t) {
      return '<a class="poptool" href="' + toolHref(t) + '">' + toolIc(t) +
        '<span class="poptool-tx"><strong>' + esc(t.name) + '</strong><span>' + esc(t.desc) + '</span></span>' +
        '<span class="poptool-go" aria-hidden="true">&rarr;</span></a>';
    }).join('');
  }

  var CAT_ORDER = ['pdf', 'video', 'images', 'developer', 'business', 'everyday'];
  var catGrid = document.getElementById('cats');
  if (catGrid) {
    catGrid.innerHTML = CAT_ORDER.map(function (slug) { return VK.category(slug); }).filter(Boolean).map(function (cat) {
      var live = VK.byCategory(cat.slug).filter(liveTool).length;
      return '<a class="catcard" href="' + catHref(cat) + '" data-cat="' + esc(cat.slug) + '">' +
        '<span class="catcard-ic">' + icon(cat.icon) + '</span>' +
        '<span class="catcard-body"><h3>' + esc(cat.name) + '</h3><p>' + live + '+ tools</p></span>' +
        '<span class="catcard-go" aria-hidden="true">&rarr;</span></a>';
    }).join('');
  }

  var TEMPLATE_IDS = [
    'invoice-generator', 'resume-builder', 'proposal-generator',
    'business-card-maker', 'swot-generator', 'packing-list'
  ];
  var tmplWrap = document.getElementById('home-templates');
  if (tmplWrap) {
    tmplWrap.innerHTML = TEMPLATE_IDS.map(one).filter(liveTool).map(function (t) {
      var cat = VK.category(t.cat) || { name: '' };
      return '<a class="tpl-card" href="' + toolHref(t) + '">' + toolIc(t) +
        '<span><strong>' + esc(t.name) + '</strong><em>' + esc(cat.name) + '</em></span>' +
        '<b aria-hidden="true">&rarr;</b></a>';
    }).join('');
  }

  var hdr = document.querySelector('.hdr');
  var homeHero = document.querySelector('.home-hero');
  var globalReach = document.querySelector('.global-reach');
  var ecosystemReach = document.querySelector('.ecosystem-reach');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function onScroll() {
    if (hdr) hdr.classList.toggle('is-scrolled', window.scrollY > 10);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (homeHero) {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      homeHero.classList.add('is-visible');
    } else {
      homeHero.classList.add('motion-ready');
      var heroObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          homeHero.classList.add('is-visible');
          heroObserver.disconnect();
        });
      }, { threshold: 0.28 });
      heroObserver.observe(homeHero);
    }
  }

  if (globalReach) {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      globalReach.classList.add('is-visible');
      document.querySelectorAll('[data-metric]').forEach(function (node) {
        node.textContent = metricDisplay(node.getAttribute('data-metric')) || node.textContent;
      });
    } else {
      var reachObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          globalReach.classList.add('is-visible');
          document.querySelectorAll('.global-reach [data-metric]').forEach(animateMetric);
          reachObserver.disconnect();
        });
      }, { threshold: 0.24 });
      reachObserver.observe(globalReach);
    }
  }
  if (ecosystemReach) {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      ecosystemReach.classList.add('is-visible');
    } else {
      var ecosystemObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          ecosystemReach.classList.add('is-visible');
          ecosystemObserver.disconnect();
        });
      }, { threshold: 0.22 });
      ecosystemObserver.observe(ecosystemReach);
    }
  }

  var frame = document.querySelector('.hero-device');
  if (frame && window.matchMedia && window.matchMedia('(pointer:fine)').matches) {
    frame.addEventListener('pointermove', function (e) {
      var r = frame.getBoundingClientRect();
      frame.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      frame.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
    frame.addEventListener('pointerleave', function () {
      frame.style.setProperty('--mx', '0');
      frame.style.setProperty('--my', '0');
    });
  }
})();
