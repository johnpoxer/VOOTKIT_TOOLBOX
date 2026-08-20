/* billing.test.js — payment authentication, webhook ownership and truthful UI. */
"use strict";
const assert = require("assert");
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
let pass = 0;
const ok = (v, m) => { assert.ok(v, m); pass++; };

(async function () {
  const billing = require("../netlify/functions/lib/billing");
  ok(billing.activeStatus("active") && billing.activeStatus("trialing"), "active and trialing grant access");
  ok(!billing.activeStatus("past_due") && !billing.activeStatus("canceled"), "non-current subscriptions do not grant access");
  ok(billing.PAID_PLANS.has("creator_pro") && !billing.PAID_PLANS.has("creator_teams"), "unfinished Teams cannot be sold");
  const checkout = require("../netlify/functions/create-checkout");
  let result = await checkout.handler({ httpMethod: "GET", headers: {} });
  ok(result.statusCode === 405, "checkout rejects GET");
  result = await checkout.handler({ httpMethod: "POST", headers: {}, body: JSON.stringify({ plan: "creator_pro_monthly" }) });
  ok(result.statusCode === 401, "checkout requires an authenticated account");
  result = await checkout.handler({ httpMethod: "POST", headers: {}, body: JSON.stringify({ plan: "creator_teams_monthly" }) });
  ok(result.statusCode === 400, "Teams checkout is disabled");
  const webhook = read("netlify/functions/stripe-webhook.js");
  ok(/webhooks\.constructEvent/.test(webhook) && /STRIPE_WEBHOOK_SECRET/.test(webhook), "webhook verifies Stripe signatures");
  ok(/customer\.subscription\.deleted/.test(webhook) && /plan: paid \? requested : "free"/.test(webhook), "canceled subscriptions return to Free");
  const checkoutSrc = read("netlify/functions/create-checkout.js");
  ok(/client_reference_id: user\.id/.test(checkoutSrc) && /subscription_data/.test(checkoutSrc), "checkout binds Stripe records to the authenticated user");
  ok(/getProfile\(user\.id\)/.test(checkoutSrc) && /already has an active subscription/.test(checkoutSrc), "checkout blocks duplicate active subscriptions");
  const schema = read("supabase/billing-migration.sql");
  ok(/drop policy if exists "own profile update"/.test(schema), "browser clients cannot self-upgrade");
  ok(/plan = 'free'/.test(schema), "profile inserts cannot start on a paid plan");
  const build = read("build.js");
  const pricing = build.slice(build.indexOf("function pricingPage"), build.indexOf("function templatesPage"));
  ok(!/Creator Teams|creator_teams/.test(pricing), "pricing contains only Free and Creator Pro");
  ok(!/data-plan="creator_teams"/.test(build), "Teams has no live checkout control");
  ok(!/Higher file-size limits|Priority processing/.test(pricing), "pricing does not claim unimplemented Pro benefits");
  const ads = require("../assets/js/ads.js");
  ok(ads.isPaidPlan("creator_pro") && !ads.isPaidPlan("free"), "paid accounts bypass ad initialization");
  console.log(`billing: ${pass} assertions passed`);
})().catch((e) => { console.error(e); process.exit(1); });
