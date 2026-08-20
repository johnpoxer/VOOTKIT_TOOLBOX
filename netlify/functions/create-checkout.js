/* Netlify function: create a Stripe Checkout session.
 *
 * Requires these environment variables (set in Netlify → Site settings → Env):
 *   STRIPE_SECRET_KEY            sk_live_… (or sk_test_…)
 *   VK_PRICE_CREATOR_PRO_MONTHLY    price_…   (from the Stripe dashboard)
 *   VK_PRICE_CREATOR_PRO_ANNUAL     price_…
 *   VK_ORIGIN                       https://www.vootkit.com  (optional; for redirect URLs)
 *
 * The public product IDs live in data/site.config.js. Checkout needs a PRICE id
 * per product — create one recurring price per product in Stripe, then paste the
 * price_… values into the env vars above. No secret ever ships to the browser.
 */
const { json, authenticatedUser, getProfile } = require("./lib/billing");

const PRICE_ENV = {
  creator_pro_monthly: "VK_PRICE_CREATOR_PRO_MONTHLY",
  creator_pro_annual: "VK_PRICE_CREATOR_PRO_ANNUAL"
};

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let plan;
  try { plan = JSON.parse(event.body || "{}").plan; } catch (e) { return json(400, { error: "Bad request" }); }
  const envName = PRICE_ENV[plan];
  if (!envName) return json(400, { error: "Unknown plan." });

  let user;
  try { user = await authenticatedUser(event); }
  catch (e) { return json(503, { error: "Account verification is temporarily unavailable." }); }
  if (!user) return json(401, { error: "Sign in before upgrading." });

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env[envName];
  if (!secret || !priceId) {
    // Safe diagnostic: booleans only — never the secret or price values.
    return json(503, {
      error: "Checkout isn't configured yet.",
      debug: {
        secretKeySet: !!secret,
        lookingForPriceVar: envName,
        priceConfigured: !!priceId
      }
    });
  }

  let stripe;
  try { stripe = require("stripe")(secret); }
  catch (e) { return json(500, { error: "Stripe library not installed on the function." }); }

  const origin = process.env.VK_ORIGIN || "https://www.vootkit.com";
  try {
    const profile = await getProfile(user.id);
    if (profile && (profile.plan === "creator_pro" || profile.subscription_status === "active" || profile.subscription_status === "trialing")) {
      return json(409, { error: "This account already has an active subscription. Manage it from Account settings." });
    }
    const params = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan: "creator_pro" },
      subscription_data: { metadata: { user_id: user.id, plan: "creator_pro" } },
      success_url: origin + "/account/?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/pricing.html?checkout=cancelled"
    };
    if (profile && profile.stripe_customer_id) params.customer = profile.stripe_customer_id;
    else if (user.email) params.customer_email = user.email;
    const session = await stripe.checkout.sessions.create(params);
    return json(200, { url: session.url });
  } catch (e) {
    return json(502, { error: "Could not start checkout. Please try again." });
  }
};
