/* codes.test.js — EAN-13 check digit + spec integrity (libs load at runtime). */
"use strict";
const assert = require("assert");
global.window = global;
const C = require("../assets/js/tools-codes.js");
const VK = require("../data/catalog.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.strictEqual(a, b, m); pass++; };
/* known EAN-13: 4006381333931 -> first 12 = 400638133393, check digit 1 */
eq(C.ean13CheckDigit("400638133393"), 1, "EAN-13 check digit (Ferrero) = 1");
/* 012345678905 -> first 12 = 012345678900... check for 012345678900 is 5 */
eq(C.ean13CheckDigit("012345678900"), 5, "EAN check digit 5");
eq(C.ean13CheckDigit("12345"), null, "too short -> null");
eq(C.ean13CheckDigit("12"), null, "too few digits -> null");
["qr-generator","qr-scanner","barcode-generator"].forEach(id => { const t = VK.find(id); ok(t && t.status === "live", id + " live"); ok(t.processing === "local", id + " local"); });
console.log(`codes: ${pass} assertions passed`);
