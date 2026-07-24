/* Netlify function: create a Stripe Checkout session.
 *
 * Requires these environment variables (set in Netlify → Site settings → Env):
 *   STRIPE_SECRET_KEY            sk_live_… (or sk_test_…)
 *   VK_PRICE_CREATOR_PRO_MONTHLY    price_…   (from the Stripe dashboard)
 *   VK_PRICE_CREATOR_PRO_ANNUAL     price_…
 *   VK_PRICE_CREATOR_TEAMS_MONTHLY  price_…
 *   VK_PRICE_CREATOR_TEAMS_ANNUAL   price_…
 *   VK_ORIGIN                       https://www.vootkit.com  (optional; for redirect URLs)
 *
 * The public product IDs live in data/site.config.js. Checkout needs a PRICE id
 * per product — create one recurring price per product in Stripe, then paste the
 * price_… values into the env vars above. No secret ever ships to the browser.
 */
const PRICE_ENV = {
  creator_pro_monthly: "VK_PRICE_CREATOR_PRO_MONTHLY",
  creator_pro_annual: "VK_PRICE_CREATOR_PRO_ANNUAL",
  creator_teams_monthly: "VK_PRICE_CREATOR_TEAMS_MONTHLY",
  creator_teams_annual: "VK_PRICE_CREATOR_TEAMS_ANNUAL"
};

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let plan;
  try { plan = JSON.parse(event.body || "{}").plan; } catch (e) { return json(400, { error: "Bad request" }); }
  const envName = PRICE_ENV[plan];
  if (!envName) return json(400, { error: "Unknown plan." });

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env[envName];
  if (!secret || !priceId) {
    // Safe diagnostic: booleans only — never the secret or price values.
    return json(503, {
      error: "Checkout isn't configured yet.",
      debug: {
        secretKeySet: !!secret,
        lookingForPriceVar: envName,
        priceVars: {
          VK_PRICE_CREATOR_PRO_MONTHLY: !!process.env.VK_PRICE_CREATOR_PRO_MONTHLY,
          VK_PRICE_CREATOR_PRO_ANNUAL: !!process.env.VK_PRICE_CREATOR_PRO_ANNUAL,
          VK_PRICE_CREATOR_TEAMS_MONTHLY: !!process.env.VK_PRICE_CREATOR_TEAMS_MONTHLY,
          VK_PRICE_CREATOR_TEAMS_ANNUAL: !!process.env.VK_PRICE_CREATOR_TEAMS_ANNUAL
        }
      }
    });
  }

  let stripe;
  try { stripe = require("stripe")(secret); }
  catch (e) { return json(500, { error: "Stripe library not installed on the function." }); }

  const origin = process.env.VK_ORIGIN || "https://www.vootkit.com";
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: origin + "/?upgraded=1",
      cancel_url: origin + "/pricing.html"
    });
    return json(200, { url: session.url });
  } catch (e) {
    return json(502, { error: "Could not start checkout. Please try again." });
  }
};

function json(status, body) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
