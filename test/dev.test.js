/* dev.test.js — developer-tool logic verified against known values. */
"use strict";
const assert = require("assert");
global.window = global;
// minimal crypto for uuid + hash in node
if (!global.crypto) global.crypto = require("crypto").webcrypto;
const D = require("../assets/js/tools-dev.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.strictEqual(a, b, m); pass++; };

/* JSON */
eq(D.formatJson('{"a":1,"b":2}', 2), '{\n  "a": 1,\n  "b": 2\n}', "pretty-print");
eq(D.minifyJson('{ "a" : 1 }'), '{"a":1}', "minify");
assert.throws(() => D.formatJson("{bad}"), "invalid JSON throws"); pass++;

/* base64 round-trip incl. UTF-8 */
eq(D.b64encode("hello"), "aGVsbG8=", "b64 encode ascii");
eq(D.b64decode("aGVsbG8="), "hello", "b64 decode");
eq(D.b64decode(D.b64encode("café ☕ 日本")), "café ☕ 日本", "b64 utf-8 round-trip");

/* JWT decode (unsigned sample: {"alg":"HS256"} . {"sub":"123","name":"A"} . sig) */
const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQSJ9.sig";
let j = D.decodeJwt(jwt);
eq(j.header.alg, "HS256", "jwt header alg");
eq(j.payload.sub, "123", "jwt payload sub");
eq(j.payload.name, "A", "jwt payload name");
assert.throws(() => D.decodeJwt("not.a.jwt.token"), "bad jwt throws"); pass++;
assert.throws(() => D.decodeJwt("onlyonepart"), "1-part throws"); pass++;

/* UUID v4 shape + version/variant bits */
let u = D.uuidV4();
ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u), "uuid v4 shape: " + u);
ok(D.uuidV4() !== D.uuidV4(), "uuids are unique");

/* URL encode/decode */
eq(D.encodeUrl("a b&c=d", true), "a%20b%26c%3Dd", "encodeURIComponent");
eq(D.decodeUrl("a%20b%26c%3Dd", true), "a b&c=d", "decode round-trip");
eq(D.encodeUrl("https://x.com/a b", false), "https://x.com/a%20b", "encodeURI keeps scheme");

/* timestamps */
let t = D.fromUnix(0);
ok(/1970-01-01/.test(t.iso), "unix 0 = epoch");
t = D.fromUnix(1753280000);
ok(/2025-07-23/.test(t.iso), "seconds interpreted, got " + t.iso);
let ux = D.toUnix("1970-01-01T00:00:00Z");
eq(ux.seconds, 0, "epoch -> 0 seconds");
assert.throws(() => D.fromUnix("notanumber"), "bad timestamp throws"); pass++;

/* hashing (async, Web Crypto) — SHA-256 of "abc" is a known vector */
(async () => {
  const h = await D.hashText("SHA-256", "abc");
  eq(h, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "SHA-256('abc') known vector");
  const h5 = await D.hashText("SHA-512", "abc");
  ok(h5.length === 128, "SHA-512 is 128 hex chars");
  console.log(`dev: ${pass + 2} assertions passed`);
})();
