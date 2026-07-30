/* errors.js — client-side error reporting.
 *
 * WHY: two tools were broken in production and nothing reported it. They were
 * found because a user complained. This closes that blind spot.
 *
 * PRIVACY IS THE HARD CONSTRAINT. Vootkit's promise is that files never leave
 * the device, and an error reporter is the easiest way to break that promise by
 * accident — a message like 'Failed to decode holiday-photos/passport-scan.pdf'
 * leaks a filename that the file itself never would. Everything reported here
 * passes through scrub() first, and scrub() is pure and unit-tested.
 *
 * It must also never make things worse: reporting is best-effort and fully
 * swallowed. A failure to report an error must not itself surface to the user.
 *
 * Payload is deliberately minimal: tool, error type, scrubbed message, pathname,
 * severity, coarse user agent. No file names, no file contents, no input, no
 * query strings, no IDs, no email. See supabase/error_logs.sql.
 */
(function (root) {
  'use strict';

  var ENDPOINT_PATH = '/rest/v1/error_logs';
  var MAX_MESSAGE = 500;
  var MAX_PER_PAGE = 8;          // one broken tool must not become a write flood
  var sent = 0;
  var seen = {};                 // dedupe: the same fault often fires repeatedly

  /* ---------- pure scrubbing (unit-tested in test/errors.test.js) ---------- */

  /* Remove anything that could identify a user's file or data.
     Order matters: paths before bare filenames, so /a/b/secret.pdf collapses
     once rather than leaving a trailing fragment behind. */
  function scrub(msg) {
    var s = String(msg == null ? '' : msg);

    s = s.replace(/blob:[^\s'"]+/gi, '<blob>');           // object URLs
    s = s.replace(/data:[^\s'"]{16,}/gi, '<data-uri>');    // inline file data
    s = s.replace(/file:\/\/[^\s'"]+/gi, '<file>');        // local file URLs
    s = s.replace(/[A-Za-z]:\\[^\s'"]+/g, '<path>');       // C:\Users\...
    s = s.replace(/(?:\/[\w .~-]+){2,}\.[A-Za-z0-9]{1,6}/g, '<path>'); // /a/b/c.pdf
    // bare filenames: name.ext where ext looks like a real file extension
    s = s.replace(/\b[\w %~-]{1,80}\.(?:pdf|docx?|xlsx?|pptx?|txt|csv|json|xml|zip|rar|7z|png|jpe?g|gif|webp|svg|bmp|tiff?|heic|mp4|mov|mkv|avi|webm|m4v|mp3|wav|flac|aac|ogg|m4a)\b/gi, '<file>');
    s = s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>');  // addresses
    s = s.replace(/\s+/g, ' ').trim();

    return s.length > MAX_MESSAGE ? s.slice(0, MAX_MESSAGE - 1) + '…' : s;
  }

  /* Browser family only. The full UA string is a fingerprinting surface and we
     do not need it — we need "is this only failing in Safari?". */
  function coarseAgent(ua) {
    var s = String(ua || '');
    var os = /Android/i.test(s) ? 'Android'
           : /iPhone|iPad|iPod/i.test(s) ? 'iOS'
           : /Mac OS X/i.test(s) ? 'macOS'
           : /Windows/i.test(s) ? 'Windows'
           : /Linux/i.test(s) ? 'Linux' : 'other';
    var br = /Edg\//.test(s) ? 'Edge'
           : /OPR\//.test(s) ? 'Opera'
           : /Firefox\//.test(s) ? 'Firefox'
           : /Chrome\//.test(s) ? 'Chrome'
           : /Safari\//.test(s) ? 'Safari' : 'other';
    return br + ' on ' + os;
  }

  /* Pathname only — query strings can carry anything. */
  function safePath(href) {
    try { return new URL(String(href), 'https://x.invalid').pathname.slice(0, 200); }
    catch (e) { return null; }
  }

  function classify(err) {
    if (!err) return 'runtime';
    if (err.name && /^[A-Za-z]+Error$/.test(err.name)) return err.name.slice(0, 40);
    return 'runtime';
  }

  /* ---------- transport (best effort, never throws) ---------- */

  function post(row) {
    try {
      var cfg = root.VK_SUPABASE;
      if (!cfg || !cfg.url || !cfg.anonKey) return;
      var url = cfg.url + ENDPOINT_PATH;
      var headers = {
        'Content-Type': 'application/json',
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + cfg.anonKey,
        Prefer: 'return=minimal'
      };
      // keepalive so a report survives the user closing the tab straight after
      // a failure — which is exactly what people do when a tool breaks.
      if (root.fetch) {
        root.fetch(url, {
          method: 'POST', headers: headers, body: JSON.stringify(row),
          keepalive: true, mode: 'cors'
        }).catch(function () {});
      }
    } catch (e) { /* reporting must never surface */ }
  }

  /* ---------- public API ---------- */

  /* report(toolName, error, opts) — opts: { type, severity } */
  function report(toolName, error, opts) {
    try {
      opts = opts || {};
      var message = scrub(error && error.message ? error.message : error);
      if (!message) return;
      if (sent >= MAX_PER_PAGE) return;

      var key = (toolName || '?') + '|' + message;
      if (seen[key]) return;
      seen[key] = 1;
      sent++;

      post({
        tool_name: String(toolName || currentTool() || 'unknown').slice(0, 64),
        error_type: String(opts.type || classify(error)).slice(0, 40),
        message: message,
        page: safePath(root.location && root.location.pathname),
        severity: opts.severity || 'error',
        user_agent: coarseAgent(root.navigator && root.navigator.userAgent)
      });
    } catch (e) { /* never surface */ }
  }

  function currentTool() {
    try {
      var host = document.getElementById('workspace');
      return host && host.getAttribute('data-tool');
    } catch (e) { return null; }
  }

  /* Global net: catches anything the engines do not funnel through a catch —
     which includes every widget tool, since those handle errors individually. */
  function installGlobalHandlers() {
    if (!root.addEventListener) return;
    root.addEventListener('error', function (e) {
      if (!e) return;
      // Resource load failures (a dead CDN script) have no .error but do matter.
      if (!e.error && e.target && e.target.src) {
        report(currentTool(), 'Failed to load ' + safeSrc(e.target.src), { type: 'ResourceError' });
        return;
      }
      report(currentTool(), e.error || e.message, { type: classify(e.error) });
    }, true);

    root.addEventListener('unhandledrejection', function (e) {
      var r = e && e.reason;
      report(currentTool(), r, { type: r && r.name ? classify(r) : 'UnhandledRejection' });
    });
  }

  /* Third-party script origins are useful (jsDelivr down); full URLs are noise. */
  function safeSrc(src) {
    try { return new URL(String(src), root.location.href).host; }
    catch (e) { return 'a script'; }
  }

  var VKErr = {
    report: report,
    scrub: scrub,
    coarseAgent: coarseAgent,
    safePath: safePath,
    classify: classify
  };

  root.VKErr = VKErr;
  if (typeof module === 'object' && module.exports) module.exports = VKErr;
  if (typeof document !== 'undefined') installGlobalHandlers();
})(typeof window !== 'undefined' ? window : globalThis);
