'use strict';
const assert = require('node:assert/strict');
const { createHandler } = require('../netlify/functions/exchange-rates');
(async () => {
  let calls = 0, time = 0;
  const handler = createHandler(async url => {
    calls++;
    const base = url.split('/').pop();
    return { ok: true, json: async () => ({ result: 'success', base_code: base, rates: { [base]: 1, CAD: 1.4 }, time_last_update_utc: 'Fri, 09 Oct 2026' }) };
  }, () => time);
  const event = base => ({ httpMethod: 'GET', queryStringParameters: { base } });
  assert.equal((await handler(event('INVALID'))).statusCode, 400);
  assert.equal(calls, 0);
  assert.equal((await handler({ httpMethod: 'POST' })).statusCode, 405);
  const [a,b] = await Promise.all([handler(event('USD')),handler(event('USD'))]);
  assert.equal(a.statusCode, 200); assert.equal(a.body, b.body); assert.equal(calls, 1);
  await handler(event('USD')); assert.equal(calls, 1);
  await handler(event('EUR')); assert.equal(calls, 2);
  assert.equal(JSON.parse(a.body).base_code, 'USD');
  assert.equal(a.headers['Netlify-Vary'], 'query=base');
  time = 3600001; await handler(event('USD')); assert.equal(calls, 3);
  const broken = createHandler(async () => { throw new Error('private upstream details'); });
  const error = await broken(event('USD'));
  assert.equal(error.statusCode, 502); assert.equal(error.headers['Cache-Control'], 'no-store');
  assert.ok(!error.body.includes('private'));
  const invalid = createHandler(async () => ({ ok: true, json: async () => ({ result: 'success', base_code: 'USD', rates: { USD: 1, CAD: -1 } }) }));
  assert.equal((await invalid(event('USD'))).statusCode, 502);
  console.log('exchange rates: cache, concurrency, validation and failures passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
