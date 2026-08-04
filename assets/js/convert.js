/* convert.js — Phase 2: capture the visitor at the moment they got value.
 *
 * The highest-intent moment on the site is the instant a tool finishes: the
 * user has just received something they wanted. Until now that screen offered a
 * download button and nothing else, so every visitor left as a stranger.
 *
 * WHAT THIS DOES NOT DO — and why it matters.
 * It never claims we can save the user's FILES. Files are processed on-device
 * and never uploaded; every tool page carries a "runs on your device" badge and
 * says so in the FAQ. A CTA promising "save your files" would contradict the
 * page it sits on, and the contradiction is exactly the kind of thing that
 * costs trust with a first-time visitor. We offer what is actually true and
 * already built: tool history (public.history) and favourites (public.favorites).
 *
 * It also does not block. The gate for the free-use limit is usage.js's job;
 * this is a prompt the user can ignore forever, and dismissing it is respected.
 */
(function (root) {
  'use strict';

  var doc = typeof document !== 'undefined' ? document : null;
  var TOOLS_KEY = 'vk-tools-used';      // distinct tool ids, lifetime
  var DISMISS_KEY = 'vk-cta-dismissed'; // ISO date of last dismissal
  var MIN_TOOLS = 3;                    // prompt once they look like a repeat user
  var COOLDOWN_DAYS = 14;

  /* ---------- pure logic (unit-tested in test/convert.test.js) ---------- */

  /* Should we show the account prompt?
     state: { signedIn, distinctTools, dismissedAt, now, minTools, cooldownDays } */
  function shouldPrompt(state) {
    var s = state || {};
    if (s.signedIn) return false;                       // nothing to sell them
    var min = s.minTools == null ? MIN_TOOLS : s.minTools;
    var n = s.distinctTools || 0;
    if (n < min) return false;                          // too early to ask
    if (s.dismissedAt) {
      var days = (s.cooldownDays == null ? COOLDOWN_DAYS : s.cooldownDays);
      var at = new Date(s.dismissedAt).getTime();
      // An unparseable stored value must be treated as "never dismissed", not as
      // a dismissal. NaN comparisons are always false, so the naive form
      // (elapsed >= days) silently suppressed the prompt forever once a single
      // corrupt localStorage value existed — a conversion feature that disables
      // itself permanently and invisibly.
      if (isFinite(at)) {
        var elapsed = (s.now - at) / 86400000;
        if (!(elapsed >= days)) return false;           // they already said no
      }
    }
    return true;
  }

  /* Add a tool id to the distinct set. Pure: takes and returns the list. */
  function addTool(list, id) {
    var out = Array.isArray(list) ? list.slice() : [];
    var clean = String(id || '').trim();
    if (!clean) return out;
    if (out.indexOf(clean) === -1) out.push(clean);
    return out.slice(-100);   // bounded; nobody needs more than this
  }

  /* The message adapts to how much the visitor has done — someone on their
     third tool is a different person from someone on their tenth. */
  function promptCopy(distinctTools) {
    var n = distinctTools || 0;
    if (n >= 8) {
      return {
        title: 'You have used ' + n + ' different Vootkit tools',
        body: 'Create a free account to keep your history and favourites in one place.'
      };
    }
    return {
      title: 'Save this to your toolkit',
      body: 'A free account remembers the tools you use and the ones you favourite, on any device.'
    };
  }

  /* ---------- storage ---------- */

  function readTools() {
    try { return JSON.parse(root.localStorage.getItem(TOOLS_KEY) || '[]') || []; }
    catch (e) { return []; }
  }
  function writeTools(list) {
    try { root.localStorage.setItem(TOOLS_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function readDismissed() {
    try { return root.localStorage.getItem(DISMISS_KEY); } catch (e) { return null; }
  }
  function markDismissed() {
    try { root.localStorage.setItem(DISMISS_KEY, new Date().toISOString()); } catch (e) {}
  }

  /* ---------- cloud history (signed-in users only) ---------- */

  /* Records WHICH tool was used and when. Never the file, never its name.
     One row per (user, tool) — see public.history. Best effort: a failure here
     must never disturb a successful tool run. */
  async function recordHistory(toolId) {
    try {
      var A = root.VKAuth;
      if (!A || !A.enabled || !toolId) return;
      var user = await A.getUser();
      if (!user) return;
      var c = await A.client();
      await c.from('history').upsert(
        { user_id: user.id, tool_id: String(toolId).slice(0, 64), used_at: new Date().toISOString() },
        { onConflict: 'user_id,tool_id' }
      );
    } catch (e) { /* never surface */ }
  }

  /* ---------- UI ---------- */

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function upPrefix() {
    return (root.VKAuth && root.VKAuth.upPrefix) ? root.VKAuth.upPrefix(location.pathname) : '../../../';
  }

  function buildCard(distinctTools) {
    var copy = promptCopy(distinctTools);
    var up = upPrefix();
    var card = el('aside', { class: 'cta-account', role: 'complementary', 'aria-label': 'Create a free account' }, [
      el('div', { class: 'cta-account-body' }, [
        el('p', { class: 'cta-account-title', text: copy.title }),
        el('p', { class: 'note', text: copy.body }),
        // The privacy line is not decoration. The user just watched a file get
        // processed; telling them plainly that signing up does not change that
        // is the difference between a prompt and a reason to distrust the page.
        el('p', { class: 'note cta-account-privacy', text: 'Your files stay on your device either way — an account saves your tool history and favourites, not your files.' })
      ]),
      el('div', { class: 'cta-account-actions' }, [
        el('a', { class: 'btn btn-primary', href: up + 'auth/sign-up/', text: 'Create free account' }),
        el('button', {
          class: 'btn btn-quiet', type: 'button', text: 'Not now',
          onClick: function () { markDismissed(); if (card.parentNode) card.parentNode.removeChild(card); }
        })
      ])
    ]);
    return card;
  }

  /* Called by an engine when a tool run succeeds. */
  function onToolSuccess(host, toolId) {
    try {
      var id = toolId || (host && host.getAttribute && host.getAttribute('data-tool'));
      if (!id) return;

      var list = addTool(readTools(), id);
      writeTools(list);
      recordHistory(id);

      /* A completed run is the only honest definition of a "use", so the
         free-tier counter is incremented here rather than on page load. Guarded
         because usage.js is a no-op when the limit is disabled, and because a
         counter failure must never break the success path the user came for. */
      try { if (root.VKUsage && root.VKUsage.countRun) root.VKUsage.countRun(); } catch (e) {}

      /* The top of the funnel. Same hook, same reason: a run is the product
         actually working, and until now nothing recorded that it ever had. */
      try {
        if (root.VKTrack) {
          var cat = (root.VK && root.VK.find && root.VK.find(id) || {}).cat;
          root.VKTrack.toolRun(id, cat);
        }
      } catch (e) {}

      // Signed-in check is async; resolve it before deciding.
      var A = root.VKAuth;
      var whoami = (A && A.enabled && A.getUser) ? A.getUser() : Promise.resolve(null);
      Promise.resolve(whoami).then(function (user) {
        var show = shouldPrompt({
          signedIn: !!user,
          distinctTools: list.length,
          dismissedAt: readDismissed(),
          now: Date.now()
        });
        if (!host) return;
        if (host.querySelector('.cta-account') || host.querySelector('.nl')) return; // never two at once

        if (show) { host.appendChild(buildCard(list.length)); return; }

        /* ONE ASK PER SUCCESS MOMENT, AND THE ACCOUNT PROMPT WINS.
         *
         * Two offers on the same screen convert worse than either alone — the
         * visitor has to choose rather than act, and the moment passes. So the
         * newsletter only appears when the account prompt has decided NOT to:
         * too few tools used, recently dismissed, or already signed in.
         *
         * That ordering is deliberate. An account is worth more than an email
         * address (history, favourites, a route to Pro), so it gets first
         * refusal; the lighter ask picks up everyone it passes over. */
        if (!root.VKNewsletter || root.VKNewsletter.alreadySubscribed()) return;
        var slot = doc.createElement('div');
        slot.setAttribute('data-newsletter', 'tool_success');
        slot.setAttribute('data-nl-compact', '1');
        host.appendChild(slot);
        root.VKNewsletter.init();
      }).catch(function () {});
    } catch (e) { /* conversion must never break a working tool */ }
  }

  root.VKConvert = {
    shouldPrompt: shouldPrompt,
    addTool: addTool,
    promptCopy: promptCopy,
    onToolSuccess: onToolSuccess,
    MIN_TOOLS: MIN_TOOLS,
    COOLDOWN_DAYS: COOLDOWN_DAYS
  };
  if (typeof module === 'object' && module.exports) module.exports = root.VKConvert;
})(typeof window !== 'undefined' ? window : globalThis);
