(function () {
  'use strict';
  var article = document.querySelector('[data-blog-article]');
  if (article) {
    var progress = document.querySelector('[data-read-progress]');
    var progressQueued = false;

    function updateProgress() {
      progressQueued = false;
      if (!progress) return;
      var start = article.getBoundingClientRect().top + window.pageYOffset;
      var distance = Math.max(1, article.offsetHeight - window.innerHeight);
      var ratio = Math.max(0, Math.min(1, (window.pageYOffset - start) / distance));
      progress.style.width = (ratio * 100).toFixed(2) + '%';
    }
    function queueProgress() {
      if (progressQueued) return;
      progressQueued = true;
      window.requestAnimationFrame(updateProgress);
    }
    window.addEventListener('scroll', queueProgress, { passive: true });
    window.addEventListener('resize', queueProgress);
    updateProgress();

    function setCopied(button) {
      var label = button.querySelector('[data-copy-label]') || button;
      var old = label.textContent;
      label.textContent = 'Copied';
      button.classList.add('is-copied');
      button.setAttribute('aria-live', 'polite');
      window.setTimeout(function () {
        label.textContent = old;
        button.classList.remove('is-copied');
      }, 1800);
    }
    function fallbackCopy(text) {
      var field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(field);
    }
    Array.prototype.slice.call(article.querySelectorAll('[data-copy-link]')).forEach(function (button) {
      button.addEventListener('click', function () {
        var text = window.location.href.split('#')[0];
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { setCopied(button); }, function () {
            fallbackCopy(text); setCopied(button);
          });
        } else { fallbackCopy(text); setCopied(button); }
      });
    });

    var tocLinks = Array.prototype.slice.call(article.querySelectorAll('[data-toc-link]'));
    tocLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        var details = link.closest ? link.closest('details') : null;
        if (details) details.open = false;
      });
    });
    if ('IntersectionObserver' in window && tocLinks.length) {
      var headings = Array.prototype.slice.call(article.querySelectorAll('.blog-body h2[id], .blog-body h3[id]'));
      var activeId = '';
      function markActive(id) {
        if (!id || id === activeId) return;
        activeId = id;
        tocLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
        });
      }
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) markActive(entry.target.id); });
      }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });
      headings.forEach(function (heading) { observer.observe(heading); });
    }
  }

  var page = document.querySelector('[data-blog-page]');
  if (!page) return;

  var grid = page.querySelector('[data-blog-grid]');
  var cards = grid ? Array.prototype.slice.call(grid.querySelectorAll('[data-blog-card]')) : [];
  var search = page.querySelector('[data-blog-search]');
  var sort = page.querySelector('[data-blog-sort]');
  var count = page.querySelector('[data-blog-count]');
  var empty = page.querySelector('[data-blog-empty]');
  var currentFilter = page.getAttribute('data-current-filter') || 'all';
  var initialFilter = currentFilter;

  function cardDate(card) {
    var t = Date.parse(card.getAttribute('data-date') || '');
    return Number.isFinite(t) ? t : 0;
  }

  function matches(card) {
    var q = search ? String(search.value || '').trim().toLowerCase() : '';
    var filters = String(card.getAttribute('data-filters') || '').split(/\s+/);
    var text = String(card.getAttribute('data-search') || '').toLowerCase();
    if (currentFilter !== 'all' && filters.indexOf(currentFilter) === -1) return false;
    if (q && text.indexOf(q) === -1) return false;
    return true;
  }

  function render() {
    if (!grid) return;
    var ordered = cards.slice().sort(function (a, b) {
      return sort && sort.value === 'oldest' ? cardDate(a) - cardDate(b) : cardDate(b) - cardDate(a);
    });
    ordered.forEach(function (card) { grid.appendChild(card); });
    var shown = 0;
    cards.forEach(function (card) {
      var ok = matches(card);
      card.hidden = !ok;
      if (ok) shown++;
    });
    if (count) count.textContent = shown + (shown === 1 ? ' article' : ' articles');
    if (empty) empty.hidden = shown !== 0;
  }

  if (search) search.addEventListener('input', render);
  if (sort) sort.addEventListener('change', render);

  Array.prototype.slice.call(page.querySelectorAll('[data-blog-filter]')).forEach(function (chip) {
    chip.addEventListener('click', function (ev) {
      if (initialFilter !== 'all') return;
      ev.preventDefault();
      currentFilter = chip.getAttribute('data-blog-filter') || 'all';
      Array.prototype.slice.call(page.querySelectorAll('[data-blog-filter]')).forEach(function (x) {
        x.classList.toggle('is-active', x === chip);
      });
      render();
      try {
        history.replaceState(null, '', currentFilter === 'all' ? '/blog/' : '/blog/#' + currentFilter);
        if (window.VKTrack) window.VKTrack.send('blog_filter', { category: currentFilter });
      } catch (e) {}
    });
  });

  if (initialFilter === 'all' && location.hash) {
    var h = location.hash.replace(/^#/, '');
    var target = page.querySelector('[data-blog-filter="' + h.replace(/"/g, '') + '"]');
    if (target) {
      currentFilter = h;
      Array.prototype.slice.call(page.querySelectorAll('[data-blog-filter]')).forEach(function (x) {
        x.classList.toggle('is-active', x === target);
      });
    }
  }
  render();
})();
