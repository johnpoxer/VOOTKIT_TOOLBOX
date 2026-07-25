/* Netlify function: create a short link.
 *
 * Requires env vars (Netlify → Site settings → Environment):
 *   SUPABASE_URL                 https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    service_role key (SERVER-ONLY — never in the browser)
 *   VK_ORIGIN                    https://www.vootkit.com   (optional)
 *
 * Stores {code, url} in the public.links table (see supabase/links.sql) using the
 * service role, which bypasses RLS. The pure helpers are exported for unit tests.
 */
// No ambiguous characters (0/O, 1/l/I) so codes are easy to read and type.
var ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var RESERVED = ["s", "api", "admin", "tools", "blog", "about", "contact", "pricing", "privacy", "terms", "account", "auth", "assets", "components"];

function genCode(len) {
  len = len || 6;
  var s = "";
  for (var i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}
function validUrl(u) {
  if (typeof u !== "string") return false;
  u = u.trim();
  if (u.length < 4 || u.length > 2048) return false;
  try {
    var p = new URL(u);
    return (p.protocol === "http:" || p.protocol === "https:") && !!p.hostname && p.hostname.indexOf(".") !== -1;
  } catch (e) { return false; }
}
function cleanAlias(a) {
  return String(a || "").trim().toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  var body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { error: "Bad request" }); }
  var url = String(body.url || "").trim();
  if (!validUrl(url)) return json(400, { error: "Enter a valid http:// or https:// URL." });

  var SUPA = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPA || !KEY) return json(503, { error: "The link shortener isn’t configured yet." });
  // Shortest form on the brand domain — no "www." (set VK_SHORT_ORIGIN to a real
  // short domain like https://vkt.co once you register one, and links get tiny).
  var origin = process.env.VK_SHORT_ORIGIN || "https://vootkit.com";

  var alias = cleanAlias(body.alias);
  if (alias && RESERVED.indexOf(alias) !== -1) return json(400, { error: "That custom name is reserved. Try another." });

  function insert(code) {
    return fetch(SUPA + "/rest/v1/links", {
      method: "POST",
      headers: { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ code: code, url: url })
    });
  }

  try {
    var code = alias || genCode(6);
    var res = null;
    for (var attempt = 0; attempt < 5; attempt++) {
      res = await insert(code);
      if (res.status === 201) return json(200, { code: code, shortUrl: origin + "/s/" + code });
      if (res.status === 409) {                       // unique-constraint conflict
        if (alias) return json(409, { error: "That custom name is taken. Try another." });
        code = genCode(6 + Math.floor(attempt / 2));  // random collision — lengthen and retry
        continue;
      }
      return json(502, { error: "Could not create the link. Please try again." });
    }
    return json(502, { error: "Could not create a unique link. Please try again." });
  } catch (e) {
    return json(502, { error: "Could not create the link. Please try again." });
  }
};

function json(status, b) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) };
}

exports._helpers = { genCode: genCode, validUrl: validUrl, cleanAlias: cleanAlias, RESERVED: RESERVED };
