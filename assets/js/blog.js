(function () {
  'use strict';
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
