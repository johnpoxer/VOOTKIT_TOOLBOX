/* Netlify function: resolve a short link and 302 to its destination.
 * Wired via netlify.toml:  /s/:code  ->  this function (?code=:code).
 * Uses the Supabase service role to look up the code and bump the click count. */
exports.handler = async function (event) {
  var origin = process.env.VK_ORIGIN || "https://www.vootkit.com";
  var notFound = origin + "/tools/seo/url-shortener/?e=notfound";

  // Read the code from the path (/s/<code>) — reliable — falling back to the
  // ?code= query param. (Netlify doesn't always substitute :code into the query.)
  var qp = (event.queryStringParameters && event.queryStringParameters.code) || "";
  var fromPath = "";
  try {
    var m = /\/s\/([^/?#]+)/.exec(event.path || event.rawUrl || "");
    if (m) fromPath = decodeURIComponent(m[1]);
  } catch (e) {}
  var code = String(qp || fromPath).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 32);

  var SUPA = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!code || !SUPA || !KEY) return redirect(notFound);

  try {
    var res = await fetch(SUPA + "/rest/v1/links?code=eq." + encodeURIComponent(code) + "&select=url", {
      headers: { "apikey": KEY, "Authorization": "Bearer " + KEY }
    });
    var rows = await res.json();
    if (!Array.isArray(rows) || !rows.length || !rows[0].url) return redirect(notFound);

    // fire-and-forget click increment (atomic RPC — see supabase/links.sql)
    fetch(SUPA + "/rest/v1/rpc/increment_link_clicks", {
      method: "POST",
      headers: { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ link_code: code })
    }).catch(function () {});

    return redirect(rows[0].url);
  } catch (e) {
    return redirect(origin + "/tools/seo/url-shortener/?e=error");
  }
};

function redirect(loc) {
  return { statusCode: 302, headers: { "Location": loc, "Cache-Control": "no-store" }, body: "" };
}
