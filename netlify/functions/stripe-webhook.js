"use strict";
const { json, updateProfile, activeStatus, PAID_PLANS } = require("./lib/billing");

async function applySubscription(subscription, deleted) {
  const userId = subscription.metadata && subscription.metadata.user_id;
  if (!userId) return;
  const requested = subscription.metadata.plan;
  const paid = !deleted && activeStatus(subscription.status) && PAID_PLANS.has(requested);
  await updateProfile(userId, {
    plan: paid ? requested : "free",
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer && subscription.customer.id,
    stripe_subscription_id: subscription.id,
    subscription_status: deleted ? "canceled" : (subscription.status || "inactive")
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) return json(503, { error: "Webhook is not configured." });

  let stripeEvent;
  try {
    const stripe = require("stripe")(secret);
    const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : Buffer.from(event.body || "", "utf8");
    const signature = event.headers && (event.headers["stripe-signature"] || event.headers["Stripe-Signature"]);
    stripeEvent = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
  } catch (e) {
    return json(400, { error: "Invalid webhook signature." });
  }

  try {
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      const userId = session.client_reference_id || (session.metadata && session.metadata.user_id);
      const plan = session.metadata && session.metadata.plan;
      if (userId && PAID_PLANS.has(plan)) {
        await updateProfile(userId, {
          plan,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer && session.customer.id,
          stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription && session.subscription.id,
          subscription_status: "active"
        });
      }
    } else if (stripeEvent.type === "customer.subscription.updated") {
      await applySubscription(stripeEvent.data.object, false);
    } else if (stripeEvent.type === "customer.subscription.deleted") {
      await applySubscription(stripeEvent.data.object, true);
    }
    return json(200, { received: true });
  } catch (e) {
    return json(500, { error: "Webhook update failed." });
  }
};

exports.applySubscription = applySubscription;
