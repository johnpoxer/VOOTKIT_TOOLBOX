"use strict";
const { json, authenticatedUser, getProfile } = require("./lib/billing");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  let user;
  try { user = await authenticatedUser(event); }
  catch (e) { return json(503, { error: "Account verification is temporarily unavailable." }); }
  if (!user) return json(401, { error: "Sign in to manage billing." });
  if (!process.env.STRIPE_SECRET_KEY) return json(503, { error: "Billing is not configured." });

  try {
    const profile = await getProfile(user.id);
    if (!profile || !profile.stripe_customer_id) return json(404, { error: "No paid subscription was found for this account." });
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const origin = process.env.VK_ORIGIN || "https://www.vootkit.com";
    const session = await stripe.billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: origin + "/account/" });
    return json(200, { url: session.url });
  } catch (e) {
    return json(502, { error: "Could not open billing management. Please try again." });
  }
};
