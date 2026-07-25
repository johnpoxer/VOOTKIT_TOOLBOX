/* Netlify function: admin Command Center stats.
 *
 * Locked down two ways:
 *  1. The caller must present a valid Netlify Identity token (same admin login as
 *     /admin/). Netlify verifies it and populates context.clientContext.user.
 *  2. That user's email must be the Vootkit owner.
 * Then it calls the service-role-only Postgres RPC public.admin_overview().
 */
var ADMIN_EMAIL = "poxer7128@gmail.com";

exports.handler = async function (event, context) {
  var user = context && context.clientContext && context.clientContext.user;
  if (!user || String(user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    return json(401, { error: "Not authorised." });
  }
  var SUPA = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPA || !KEY) return json(503, { error: "Admin stats aren’t configured yet." });

  try {
    var res = await fetch(SUPA + "/rest/v1/rpc/admin_overview", {
      method: "POST",
      headers: { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json" },
      body: "{}"
    });
    if (!res.ok) return json(502, { error: "Stats query failed." });
    var data = await res.json();
    return json(200, { stats: data });
  } catch (e) {
    return json(502, { error: "Could not load stats." });
  }
};

function json(status, b) {
  return { statusCode: status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(b) };
}
