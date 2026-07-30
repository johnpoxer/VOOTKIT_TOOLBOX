/* errors.test.js — the privacy scrubber for client error reporting.
 *
 * This is the highest-stakes pure function in the codebase. Vootkit's entire
 * promise is that files never leave the device, and an error reporter is the
 * easiest way to break that promise by accident: a thrown message like
 *   "Failed to decode holiday/passport-scan.pdf"
 * leaks a filename the file itself never would.
 *
 * Every assertion below is a thing that must never reach the server. */
"use strict";
const assert = require("assert");
global.window = global;
const E = require("../assets/js/errors.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.strictEqual(a, b, m); pass++; };
const clean = (s, m) => {
  const out = E.scrub(s);
  ok(!/passport|secret|holiday|invoice|myfile|tax-return/i.test(out), m + " -> " + out);
  return out;
};

/* --- file names must never survive, whatever the extension --- */
clean("Failed to decode passport-scan.pdf", "pdf filename removed");
clean("Could not read holiday-photos.zip", "zip filename removed");
clean("Error in my-secret-invoice.docx", "docx filename removed");
clean("Cannot process tax-return.xlsx", "xlsx filename removed");
clean("Bad frame in holiday.mp4", "mp4 filename removed");
clean("Corrupt myfile.png", "png filename removed");
ok(E.scrub("Failed on report.pdf").includes("<file>"), "filename replaced with a placeholder");

/* --- paths, on every platform --- */
clean("ENOENT /home/john/documents/passport.pdf", "unix path removed");
clean("Cannot open C:\\Users\\John\\Desktop\\secret.docx", "windows path removed");
ok(E.scrub("Cannot open C:\\Users\\John\\Desktop\\a.docx").includes("<path>"), "windows path placeholder");
ok(!/john/i.test(E.scrub("ENOENT /home/john/docs/a.pdf")), "username inside a path is removed too");

/* --- object URLs and inline data are file contents by another name --- */
ok(E.scrub("blob:https://vootkit.com/9f8c-1234").includes("<blob>"), "blob URL removed");
ok(E.scrub("bad data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==").includes("<data-uri>"), "data URI removed");
ok(!/iVBORw0/.test(E.scrub("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==")), "base64 payload never survives");
ok(E.scrub("file:///Users/j/secret.pdf").includes("<file>"), "file:// URL removed");

/* --- personal identifiers --- */
ok(E.scrub("Contact john.doe@example.com failed").includes("<email>"), "email removed");
ok(!/example\.com/.test(E.scrub("mail to a@example.com")), "email domain removed with the address");

/* --- genuine diagnostics MUST survive, or the whole thing is useless --- */
eq(E.scrub("WinAnsi cannot encode (0x20b9)"), "WinAnsi cannot encode (0x20b9)", "real error text is preserved");
eq(E.scrub("Out of memory"), "Out of memory", "short diagnostics preserved");
ok(E.scrub("ffmpeg exited with code 1").includes("ffmpeg"), "library names preserved");
ok(E.scrub("Failed to load pdf-lib.min.js").length > 0, "still produces something useful");

/* --- bounds and hostile input --- */
ok(E.scrub("x".repeat(2000)).length <= 500, "message capped at 500 chars");
eq(E.scrub(""), "", "empty string is safe");
eq(E.scrub(null), "", "null is safe");
eq(E.scrub(undefined), "", "undefined is safe");
eq(E.scrub(12345), "12345", "non-string coerced safely");
eq(E.scrub("  spaced   out  "), "spaced out", "whitespace collapsed");

/* --- user agent must be coarse: a fingerprint is not a diagnosis --- */
const ua = E.coarseAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1");
eq(ua, "Safari on iOS", "iPhone Safari identified without the full UA");
ok(!/15E148|605\.1\.15/.test(ua), "build identifiers dropped");
eq(E.coarseAgent("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0 Safari/537.36"), "Chrome on Windows", "Chrome on Windows");
eq(E.coarseAgent("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Edg/120"), "Edge on Windows", "Edge detected before Chrome");
eq(E.coarseAgent(""), "other on other", "unknown UA is safe");

/* --- pathname only: query strings can carry anything --- */
eq(E.safePath("/tools/pdf/text-to-pdf/"), "/tools/pdf/text-to-pdf/", "pathname preserved");
ok(!E.safePath("/tools/x/?email=a@b.com&token=abc").includes("email"), "query string dropped");
ok(!E.safePath("/t/?token=secret").includes("secret"), "tokens never reach the server");

/* --- error classification --- */
eq(E.classify(new TypeError("x")), "TypeError", "TypeError classified");
eq(E.classify(new RangeError("x")), "RangeError", "RangeError classified");
eq(E.classify(null), "runtime", "null falls back to runtime");
eq(E.classify({}), "runtime", "plain object falls back to runtime");

/* --- reporting must never throw, whatever it is handed --- */
[undefined, null, 0, "", {}, [], new Error("boom"), "string error"].forEach((v, i) => {
  let threw = false;
  try { E.report("some-tool", v); } catch (e) { threw = true; }
  ok(!threw, "report() swallows input #" + i);
});
let threw = false;
try { E.report(null, null, null); } catch (e) { threw = true; }
ok(!threw, "report() survives null everything");

/* --- the SQL contract the client depends on --- */
const sql = require("fs").readFileSync(require("path").join(__dirname, "../supabase/error_logs.sql"), "utf8");
ok(/create table if not exists public\.error_logs/.test(sql), "error_logs table defined");
ok(/enable row level security/.test(sql), "RLS enabled");
ok(/for insert\s*\n\s*to anon, authenticated/.test(sql), "anon may insert");
ok(!/for select[\s\S]{0,80}to anon/.test(sql), "anon may NOT read other people's errors");
ok(/char_length\(message\)\s+between 1 and 500/.test(sql), "server-side message cap matches the client cap");
["tool_name", "error_type", "message", "severity", "resolved", "created_at"].forEach(c => {
  ok(new RegExp("\\n  " + c + "\\s").test(sql), `column ${c} present (protocol requirement)`);
});

console.log(`errors: ${pass} assertions passed`);

/* Function grants — verified against the live project.
   Postgres grants EXECUTE to PUBLIC by default; "revoke from anon" does NOT
   remove it. Both functions are SECURITY DEFINER, so the default grant let the
   anon key read error messages and DELETE the whole log. */
ok(/revoke all on function public\.tool_health\(int\) from public, anon, authenticated;/.test(sql),
   "tool_health revoked from PUBLIC, not just anon");
ok(/revoke all on function public\.prune_error_logs\(int\) from public, anon, authenticated;/.test(sql),
   "prune_error_logs revoked from PUBLIC, not just anon");
ok(/grant execute on function public\.tool_health\(int\) to service_role;/.test(sql),
   "tool_health granted back to service_role only");
ok(/grant execute on function public\.prune_error_logs\(int\) to service_role;/.test(sql),
   "prune_error_logs granted back to service_role only");
console.log(`errors + grants: ${pass} total assertions passed`);
