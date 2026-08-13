(function () {
  "use strict";

  var root = document.querySelector("[data-tools-dir]");
  if (!root) return;

  var cards = Array.prototype.slice.call(root.querySelectorAll("[data-tool-card]"));
  var grid = root.querySelector("[data-dir-grid]");
  var qInput = root.querySelector("[data-dir-q]");
  var form = root.querySelector("[data-dir-search]");
  var suggest = root.querySelector("[data-dir-suggestions]");
  var count = root.querySelector("[data-dir-count]");
  var sort = root.querySelector("[data-dir-sort]");
  var empty = root.querySelector("[data-dir-empty]");
  var clear = root.querySelector("[data-dir-clear]");
  var activeSuggestion = -1;

  var state = {
    q: "",
    cat: "all",
    cats: [],
    sort: "category",
    view: "boxes"
  };

  var groupMap = {};
  root.querySelectorAll("[data-dir-cat]").forEach(function (node) {
    var key = norm(node.getAttribute("data-dir-cat") || "all") || "all";
    var raw = node.getAttribute("data-dir-cats") || "";
    if (raw) groupMap[key] = raw.split(",").map(norm).filter(Boolean);
    else if (key !== "all") groupMap[key] = [key];
  });

  var intentRules = [
    { re: /make.*pdf.*small|pdf.*small|compress.*pdf|reduce.*pdf|shrink.*pdf/, ids: ["compress-pdf"] },
    { re: /join.*pdf|combine.*pdf|merge.*pdf|put.*pdf.*together/, ids: ["merge-pdf"] },
    { re: /remove.*background|background.*remov|cut.*background|transparent.*png/, ids: ["remove-background"] },
    { re: /jpg.*png|jpeg.*png|png.*from.*jpg|jpg.*into.*png/, ids: ["jpg-to-png"] },
    { re: /png.*jpg|png.*jpeg|jpg.*from.*png/, ids: ["png-to-jpg"] },
    { re: /image.*small|photo.*small|compress.*image|reduce.*photo|reduce.*image/, ids: ["compress-image"] },
    { re: /resize.*image|change.*image.*size|image.*dimension|scale.*photo/, ids: ["resize-image"] },
    { re: /video.*small|compress.*video|reduce.*video|shrink.*video/, ids: ["compress-video"] },
    { re: /video.*gif|gif.*from.*video|make.*gif/, ids: ["video-to-gif"] },
    { re: /format.*json|pretty.*json|beautify.*json|validate.*json/, ids: ["json-formatter"] },
    { re: /format.*sql|pretty.*sql|beautify.*sql/, ids: ["sql-formatter"] },
    { re: /word.*count|count.*word|character.*count|essay.*limit/, ids: ["word-counter"] },
    { re: /qr.*code|make.*qr|create.*qr/, ids: ["qr-generator"] },
    { re: /house.*loan|home.*loan|mortgage.*payment|calculate.*mortgage/, ids: ["mortgage-calculator", "loan-calculator"] },
    { re: /loan.*payment|calculate.*loan|personal.*loan/, ids: ["loan-calculator"] },
    { re: /invoice|bill.*client/, ids: ["invoice-generator"] },
    { re: /exchange.*rate|currency|convert.*money|fx/, ids: ["currency-converter"] },
    { re: /password.*generate|make.*password|secure.*password/, ids: ["password-generator"] },
    { re: /password.*strength|check.*password/, ids: ["password-strength"] }
  ];

  function norm(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function params() {
    try { return new URLSearchParams(window.location.search || ""); } catch (e) { return new URLSearchParams(""); }
  }

  function readState() {
    var p = params();
    state.q = norm(p.get("q") || "");
    state.cat = norm(p.get("cat") || "all") || "all";
    state.cats = state.cat === "all" ? [] : (groupMap[state.cat] || [state.cat]);
    state.sort = norm(p.get("sort") || "category") || "category";
    try { state.view = localStorage.getItem("vk-tools-view-v2") || "boxes"; } catch (e) {}
    if (p.get("view")) state.view = norm(p.get("view"));
    if (state.view !== "grid") state.view = "boxes";
    if (["popular", "az", "new", "category"].indexOf(state.sort) === -1) state.sort = "category";
    if (qInput) qInput.value = state.q;
    if (sort) sort.value = state.sort;
  }

  function writeState(push) {
    var p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.cat && state.cat !== "all") p.set("cat", state.cat);
    if (state.sort !== "category") p.set("sort", state.sort);
    if (state.view !== "boxes") p.set("view", state.view);
    var next = window.location.pathname + (p.toString() ? "?" + p.toString() : "");
    if (push) history.pushState(state, "", next);
    else history.replaceState(state, "", next);
  }

  function matchingIntent(query) {
    if (!query) return [];
    var out = [];
    intentRules.forEach(function (rule) {
      if (rule.re.test(query)) out = out.concat(rule.ids);
    });
    return out;
  }

  function score(card) {
    var query = state.q;
    if (state.cat !== "all" && state.cats.indexOf(card.dataset.cat) === -1) return null;
    if (!query) return {
      card: card,
      score: baseScore(card)
    };

    var hay = norm(card.dataset.search || card.textContent);
    var name = norm(card.dataset.name);
    var id = card.dataset.id;
    var terms = query.split(" ").filter(Boolean);
    var intent = matchingIntent(query);
    var directIntent = intent.indexOf(id) !== -1;
    var loose = terms.every(function (term) { return hay.indexOf(term) !== -1; });
    var partial = terms.length > 1 && terms.filter(function (term) { return hay.indexOf(term) !== -1; }).length >= Math.ceil(terms.length * 0.66);

    if (!directIntent && !loose && !partial && name.indexOf(query) === -1) return null;

    var s = directIntent ? 250 : 0;
    if (name === query) s += 180;
    if (name.indexOf(query) === 0) s += 90;
    if (name.indexOf(query) > -1) s += 60;
    if (loose) s += 45;
    if (partial) s += 15;
    terms.forEach(function (term) {
      if (name.indexOf(term) > -1) s += 8;
      if (hay.indexOf(term) > -1) s += 3;
    });
    s += baseScore(card);
    return { card: card, score: s };
  }

  function baseScore(card) {
    var s = 0;
    if (card.dataset.status === "live") s += 20;
    if (card.dataset.popular === "1") s += 12;
    if (card.dataset.new === "1") s += 5;
    return s;
  }

  function sortRows(rows) {
    function orderNumber(card, key, fallback) {
      var n = parseInt(card.dataset[key] || fallback, 10);
      return Number.isFinite(n) ? n : parseInt(fallback, 10);
    }
    function categoryCompare(a, b) {
      var ac = orderNumber(a.card, "catorder", "999");
      var bc = orderNumber(b.card, "catorder", "999");
      if (ac !== bc) return ac - bc;
      if (a.card.dataset.cat !== b.card.dataset.cat) return a.card.dataset.cat.localeCompare(b.card.dataset.cat);
      return orderNumber(a.card, "rank", "99999") - orderNumber(b.card, "rank", "99999");
    }
    return rows.sort(function (a, b) {
      if (state.q && b.score !== a.score) return b.score - a.score;
      if (state.sort === "az") return a.card.dataset.name.localeCompare(b.card.dataset.name);
      if (state.sort === "new") {
        if (a.card.dataset.new !== b.card.dataset.new) return b.card.dataset.new - a.card.dataset.new;
        return a.card.dataset.name.localeCompare(b.card.dataset.name);
      }
      if (state.sort === "category") {
        return categoryCompare(a, b);
      }
      var ar = orderNumber(a.card, "dirrank", "9999");
      var br = orderNumber(b.card, "dirrank", "9999");
      if (ar !== br) return ar - br;
      if (a.card.dataset.popular !== b.card.dataset.popular) return b.card.dataset.popular - a.card.dataset.popular;
      if (a.card.dataset.popular === "1" && b.card.dataset.popular === "1") return orderNumber(a.card, "poprank", "9999") - orderNumber(b.card, "poprank", "9999");
      if (a.card.dataset.status !== b.card.dataset.status) return a.card.dataset.status === "live" ? -1 : 1;
      return orderNumber(a.card, "rank", "99999") - orderNumber(b.card, "rank", "99999");
    });
  }

  function updateActiveFilters() {
    root.querySelectorAll("[data-dir-cat]").forEach(function (node) {
      node.classList.toggle("is-active", (node.getAttribute("data-dir-cat") || "all") === state.cat);
      if (node.classList.contains("dir-cat-link")) node.setAttribute("aria-current", node.classList.contains("is-active") ? "true" : "false");
    });
    root.querySelectorAll("[data-dir-view]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-dir-view") === state.view);
    });
    root.classList.toggle("is-grid", state.view === "grid");
  }

  function render(push) {
    var rows = sortRows(cards.map(score).filter(Boolean));
    var total = rows.length;
    var visible = rows.map(function (row) { return row.card; });
    var visibleSet = new Set(visible);

    cards.forEach(function (card) {
      card.hidden = !visibleSet.has(card);
    });
    visible.forEach(function (card) {
      grid.appendChild(card);
    });

    if (count) {
      if (!total) count.textContent = "No tools found";
      else count.textContent = "Showing all " + total + (total === 1 ? " tool" : " tools");
    }
    if (empty) empty.hidden = total !== 0;
    if (grid) grid.hidden = total === 0;
    updateActiveFilters();
    writeState(push);
  }

  function suggestionRows() {
    return sortRows(cards.map(score).filter(Boolean)).slice(0, 7);
  }

  function renderSuggestions() {
    if (!suggest || !qInput) return;
    activeSuggestion = -1;
    if (!state.q) {
      suggest.hidden = true;
      suggest.innerHTML = "";
      return;
    }
    var rows = suggestionRows();
    if (!rows.length) {
      suggest.hidden = true;
      suggest.innerHTML = "";
      return;
    }
    suggest.innerHTML = '<p>Best match</p>' + rows.map(function (row, i) {
      var c = row.card;
      return '<a role="option" data-dir-suggest="' + i + '" href="' + c.href + '">' +
        '<strong>' + escapeHtml(c.dataset.name) + '</strong><span>' + escapeHtml(c.querySelector("p").textContent) + '</span></a>';
    }).join("");
    suggest.hidden = false;
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function moveSuggestion(dir) {
    if (!suggest || suggest.hidden) return;
    var opts = Array.prototype.slice.call(suggest.querySelectorAll("[data-dir-suggest]"));
    if (!opts.length) return;
    activeSuggestion = (activeSuggestion + dir + opts.length) % opts.length;
    opts.forEach(function (opt, i) {
      opt.classList.toggle("is-active", i === activeSuggestion);
      opt.setAttribute("aria-selected", i === activeSuggestion ? "true" : "false");
    });
  }

  readState();
  render(false);

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      state.q = norm(qInput && qInput.value);
      render(true);
      renderSuggestions();
      if (suggest) suggest.hidden = true;
    });
  }

  if (qInput) {
    qInput.addEventListener("input", function () {
      state.q = norm(qInput.value);
      render(false);
      renderSuggestions();
    });
    qInput.addEventListener("focus", renderSuggestions);
    qInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (suggest) suggest.hidden = true;
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveSuggestion(1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveSuggestion(-1);
        return;
      }
      if (e.key === "Enter" && suggest && !suggest.hidden && activeSuggestion > -1) {
        var active = suggest.querySelector('[data-dir-suggest="' + activeSuggestion + '"]');
        if (active) {
          e.preventDefault();
          window.location.href = active.href;
        }
      }
    });
  }

  document.addEventListener("click", function (e) {
    if (suggest && !suggest.contains(e.target) && e.target !== qInput) suggest.hidden = true;
  });

  root.addEventListener("click", function (e) {
    var cat = e.target.closest("[data-dir-cat]");
    if (cat && root.contains(cat)) {
      e.preventDefault();
      state.cat = cat.getAttribute("data-dir-cat") || "all";
      state.cats = state.cat === "all"
        ? []
        : ((cat.getAttribute("data-dir-cats") || "").split(",").map(norm).filter(Boolean) || [state.cat]);
      if (state.cat !== "all" && !state.cats.length) state.cats = [state.cat];
      render(true);
      return;
    }
    var view = e.target.closest("[data-dir-view]");
    if (view && root.contains(view)) {
      state.view = view.getAttribute("data-dir-view") === "grid" ? "grid" : "boxes";
      try { localStorage.setItem("vk-tools-view-v2", state.view); } catch (err) {}
      render(false);
      return;
    }
    if (clear && e.target === clear) {
      state.q = "";
      state.cat = "all";
      state.cats = [];
      state.sort = "category";
      if (qInput) qInput.value = "";
      if (sort) sort.value = state.sort;
      render(true);
    }
  });

  if (sort) {
    sort.addEventListener("change", function () {
      state.sort = sort.value;
      render(true);
    });
  }

  window.addEventListener("popstate", function () {
    readState();
    render(false);
  });
})();
