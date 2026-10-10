'use strict';

// Public data only. Files and account details never enter this endpoint.
const BASES = new Set(['USD','EUR','GBP','JPY','CAD','AUD','CHF','CNY','INR','NGN','ZAR','BRL','MXN','SGD','HKD','SEK','NOK','NZD','KRW','AED']);
const TTL = 60 * 60 * 1000;
function createHandler(fetcher = global.fetch, now = Date.now) {
  const cache = new Map(), pending = new Map();
  function reply(statusCode, data) {
    return { statusCode, headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': statusCode === 200 ? 'public, max-age=300' : 'no-store',
      'Netlify-CDN-Cache-Control': statusCode === 200 ? 'public, durable, s-maxage=3600' : 'no-store',
      'Netlify-Vary': 'query=base'
    }, body: JSON.stringify(data) };
  }
  async function load(base) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetcher('https://open.er-api.com/v6/latest/' + base, { signal: controller.signal });
      if (!response.ok) throw new Error('Rate service unavailable');
      const data = await response.json();
      if (data.result !== 'success' || data.base_code !== base || !data.rates ||
          !BASES.has(base) || data.rates[base] !== 1 ||
          !Object.values(data.rates).every(v => typeof v === 'number' && Number.isFinite(v) && v > 0)) {
        throw new Error('Invalid rate response');
      }
      const value = { result: 'success', base_code: base, rates: data.rates,
        time_last_update_utc: data.time_last_update_utc, source: 'ExchangeRate-API' };
      cache.set(base, { time: now(), value });
      return value;
    } finally { clearTimeout(timer); }
  }
  return async function handler(event) {
    if (event.httpMethod !== 'GET') return { ...reply(405, { error: 'Method not allowed' }), headers: { ...reply(405, {}).headers, Allow: 'GET' } };
    const base = String((event.queryStringParameters || {}).base || 'USD').toUpperCase();
    if (!BASES.has(base)) return reply(400, { error: 'Unsupported base currency' });
    const saved = cache.get(base);
    if (saved && now() - saved.time < TTL) return reply(200, saved.value);
    try {
      if (!pending.has(base)) pending.set(base, load(base).finally(() => pending.delete(base)));
      return reply(200, await pending.get(base));
    } catch (_) { return reply(502, { error: 'Rates are temporarily unavailable. Please try again.' }); }
  };
}
exports.handler = createHandler();
exports.createHandler = createHandler;
