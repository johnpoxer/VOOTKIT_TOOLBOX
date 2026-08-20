"use strict";

const SUPABASE_URL = process.env.VK_SUPABASE_URL || process.env.SUPABASE_URL || "https://qfqdmzwmjxdiqzeybaoo.supabase.co";
const ANON_KEY = process.env.VK_SUPABASE_ANON || process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.VK_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAID_PLANS = new Set(["creator_pro"]);

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body)
  };
}

function bearer(event) {
  const value = (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match ? match[1] : "";
}

async function authenticatedUser(event) {
  const token = bearer(event);
  if (!token || !ANON_KEY) return null;
  const response = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: ANON_KEY, Authorization: "Bearer " + token }
  });
  if (!response.ok) return null;
  return response.json();
}

function adminHeaders(extra) {
  if (!SERVICE_KEY) throw new Error("Supabase service role is not configured.");
  return Object.assign({
    apikey: SERVICE_KEY,
    Authorization: "Bearer " + SERVICE_KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  }, extra || {});
}

async function getProfile(userId) {
  const response = await fetch(SUPABASE_URL + "/rest/v1/profiles?id=eq." + encodeURIComponent(userId) + "&select=*", {
    headers: adminHeaders()
  });
  if (!response.ok) throw new Error("Could not read billing profile.");
  const rows = await response.json();
  return rows[0] || null;
}

async function updateProfile(userId, values) {
  const response = await fetch(SUPABASE_URL + "/rest/v1/profiles?id=eq." + encodeURIComponent(userId), {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(Object.assign({}, values, { subscription_updated_at: new Date().toISOString() }))
  });
  if (!response.ok) throw new Error("Could not update billing profile.");
  const rows = await response.json();
  return rows[0] || null;
}

function activeStatus(status) {
  return status === "active" || status === "trialing";
}

module.exports = { json, bearer, authenticatedUser, getProfile, updateProfile, activeStatus, PAID_PLANS };
