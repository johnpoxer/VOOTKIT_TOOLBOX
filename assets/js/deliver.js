/* deliver.js — the single point where a finished result reaches the user.
 *
 * WHY THIS EXISTS.
 * Before this file, a completed tool handed its output to the user from five
 * different places: filetool.js, widget.js, tools-pdfmake.js, tools-pdftools.js
 * and the audio/video paths. Each had its own `a.download` and its own idea of
 * what to do afterwards. That had already cost something measurable — the
 * `tool_download` event only ever fired from filetool.js, so every download
 * from the other four harnesses was invisible in GA4 and the download numbers
 * were undercounting by an unknown amount.
 *
 * It also made the signup gate impossible to build honestly. Five gates would
 * drift apart, and the first one anybody forgot to add would be a hole in the
 * whole funnel. So: one function, one policy, one event, one run log.
 *
 * WHAT THIS IS NOT.
 * It is not a security boundary and must never be described as one. Every tool
 * that matters runs on-device, so by the time this is called the finished blob
 * is already sitting in the user's browser. Anyone who wants the file without
 * an account can have it from devtools in about four seconds. This is a
 * conversion device — a well-placed ask at the moment the user most wants
 * something — and it should be judged on conversion, not on how well it holds.
 *
 * WHICH WAY IT FAILS.
 * Open. If the gate module is missing, if Supabase is down, if the plan lookup
 * throws — the user gets their file. Refusing someone the thing they came for
 * because a script failed to load is the single worst outcome available here,
 * far worse than a missed signup. Every catch in this file resolves toward
 * handing the file over.
 */
(function (root) {
  'use strict';

  var doc = typeof document !== 'undefined' ? document : null;

  /* ---------- policy (pure, unit-tested in test/deliver.test.js) ---------- */

  /* Decide what happens when a finished result is ready.
   *
   * state: {
   *   signedIn      boolean
   *   pro           boolean
   *   gateEnabled   boolean   — config: is the signup gate switched on
   *   limitEnabled  boolean   — config: is the free daily limit switched on
   *   limitHard     boolean   — config: does the limit block or only nudge
   *   limitCount    number    — runs allowed per day
   *   runsToday     number
   * }
   *
   * returns 'allow' | 'gate' | 'limit'
   */
  function decide(state) {
    var s = state || {};

    /* Paying users are never interrupted. This is first for a reason: every
       other branch below is a sales pitch, and pitching Pro to somebody who
       already bought it is the fastest way to make them regret it. */
    if (s.pro) return 'allow';

    /* THE GATE COMES BEFORE THE LIMIT, and the order is not arbitrary.
     *
     * An anonymous visitor who has run six tools has hit the free ceiling, but
     * telling a stranger "you have used up your free daily allowance, upgrade
     * to Pro" is incoherent — they have no account, so they have no allowance
     * to have used up, and the first thing the site ever says to them is a
     * demand for money. Ask them to create an account first. The limit is a
     * conversation for people who already have somewhere to apply it. */
    if (s.gateEnabled && !s.signedIn) return 'gate';

    if (s.limitEnabled && s.limitHard && (s.runsToday || 0) >= (s.limitCount || 0)) return 'limit';

    return 'allow';
  }

  /* The gate's copy adapts to what the user just did. Someone on their first
     result is being asked to trust a site they met ninety seconds ago; someone
     on their fourth has already decided the tools work. */
  function gateCopy(runsToday) {
    var n = runsToday || 0;
    if (n >= 3) {
      return {
        title: 'Your file is ready',
        body: 'You have run ' + n + ' tools here today. Create a free account to download this one and keep the rest.'
      };
    }
    return {
      title: 'Your file is ready',
      body: 'Create a free Vootkit account to download it.'
    };
  }

  /* ---------- config ---------- */

  function cfg() {
    var C = (root.VK_CONFIG || {});
    var g = C.gate || {};
    var f = C.freeLimit || {};
    return {
      gateEnabled: g.enabled === true,
      exemptTools: g.exemptTools || [],
      limitEnabled: f.enabled === true,
      limitHard: f.hard === true,
      limitCount: f.count || 0
    };
  }

  /* ---------- the actual handover ---------- */

  /* Kept identical to the five implementations it replaces, so that routing a
     harness through here changes policy and nothing else. */
  function handover(blob, name) {
    if (!doc) return false;
    /* Returns false rather than throwing. Every caller uses the result to
       decide what to tell the user, and the one thing worse than a failed
       download is a failed download announced as a success. */
    try {
      var u = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = u;
      a.download = name || 'vootkit-download';
      doc.body.appendChild(a);
      a.click();
      setTimeout(function () {
        try { URL.revokeObjectURL(u); } catch (e) {}
        if (a.parentNode) a.parentNode.removeChild(a);
      }, 1500);
      return true;
    } catch (e) { return false; }
  }

  function toolCategory(toolId) {
    try { return (root.VK && root.VK.find && root.VK.find(toolId) || {}).cat; }
    catch (e) { return undefined; }
  }

  /* ---------- state gathering ---------- */

  async function readState(toolId) {
    var c = cfg();
    var state = {
      signedIn: false, pro: false,
      gateEnabled: c.gateEnabled && c.exemptTools.indexOf(toolId) === -1,
      limitEnabled: c.limitEnabled, limitHard: c.limitHard, limitCount: c.limitCount,
      runsToday: 0
    };
    try { if (root.VKUsage && root.VKUsage.readCount) state.runsToday = root.VKUsage.readCount(); } catch (e) {}
    try {
      var A = root.VKAuth;
      if (A && A.enabled && A.getUser) {
        var user = await A.getUser();
        if (user) {
          state.signedIn = true;
          /* Plan lives on profiles.plan — same source usage.js reads, so the
             two can never disagree about who is Pro. */
          try {
            var cl = await A.client();
            var r = await cl.from('profiles').select('plan').eq('id', user.id).single();
            var plan = r && r.data && r.data.plan;
            state.pro = plan === 'creator_pro' || plan === 'creator_teams';
          } catch (e) {}
        }
      }
    } catch (e) { /* fail open: an unknown user is treated as anonymous, and if
                     the gate is off that still means they get the file */ }
    return state;
  }

  /* ---------- the run log ----------
   * Records THAT a tool produced a result, for the signed-in user, and nothing
   * else. No file name, no size, no content, no options. The whole point of the
   * table is to answer "did this person come back?", which needs a user id, a
   * tool id and a timestamp — and is answered by nothing else. */
  async function logRun(toolId) {
    try {
      var A = root.VKAuth;
      if (!A || !A.enabled || !toolId) return;
      var user = await A.getUser();
      if (!user) return;
      var c = await A.client();
      await c.from('tool_runs').insert({ tool_id: String(toolId).slice(0, 64) });
    } catch (e) { /* never surface: a missed analytics row is not the user's problem */ }
  }

  /* ---------- entry point ---------- */

  /* deliver(blob, name, ctx)
   *   ctx: { toolId, host }   host = the workspace element, for placing UI
   *
   * Resolves true if the file reached the user, false if it was withheld
   * pending an account or an upgrade. Callers should not branch on it — it is
   * there for tests and for callers that want to skip their own success UI.
   */
  async function deliver(blob, name, ctx) {
    var o = ctx || {};
    var toolId = o.toolId || '';
    var cat = toolCategory(toolId);

    var state;
    try { state = await readState(toolId); }
    catch (e) { handover(blob, name); return true; }   // fail open

    var verdict;
    try { verdict = decide(state); }
    catch (e) { verdict = 'allow'; }

    if (verdict === 'gate') {
      /* If the gate module did not load, the ask cannot be made — so make no
         ask and give them the file. A blank screen where a signup form should
         be is worse than a missed conversion. */
      if (!root.VKGate || !root.VKGate.open) { handover(blob, name); return true; }
      try { if (root.VKTrack) root.VKTrack.signupViewed(toolId, cat); } catch (e) {}
      root.VKGate.open({
        host: o.host,
        copy: gateCopy(state.runsToday),
        toolId: toolId,
        /* Google navigates away, so the gate needs the file itself in order to
           park it on the device and finish the job when the user comes back. */
        blob: blob, name: name,
        /* Resumes the exact action the user asked for. They clicked Download;
           after signing up the thing that happens next must be the download,
           not a dashboard, not a welcome page, not the tool again from the top. */
        onUnlocked: function () {
          /* Reports back so the gate can tell the truth. A download_unlocked
             event for a file that never arrived would put a hole in the exact
             funnel number this whole feature exists to measure. */
          if (!handover(blob, name)) return false;
          try { if (root.VKTrack) root.VKTrack.downloadUnlocked(toolId, cat); } catch (e) {}
          try { if (root.VKTrack) root.VKTrack.toolDownload(toolId, cat); } catch (e) {}
          logRun(toolId);
          return true;
        }
      });
      return false;
    }

    if (verdict === 'limit') {
      if (!root.VKUsage || !root.VKUsage.showLimit) { handover(blob, name); return true; }
      root.VKUsage.showLimit(o.host, toolId);
      return false;
    }

    handover(blob, name);
    try { if (root.VKTrack) root.VKTrack.toolDownload(toolId, cat); } catch (e) {}
    logRun(toolId);
    return true;
  }

  root.VKDeliver = {
    decide: decide,
    gateCopy: gateCopy,
    deliver: deliver,
    handover: handover,
    readState: readState
  };
  if (typeof module === 'object' && module.exports) module.exports = root.VKDeliver;
})(typeof window !== 'undefined' ? window : globalThis);
