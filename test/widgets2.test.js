/* widgets2.test.js — everyday + privacy + design logic, hand-verified. */
"use strict";
const assert = require("assert");
global.window = global;
if (!global.crypto) global.crypto = require("crypto").webcrypto;
const E = require("../assets/js/tools-everyday.js");
const P = require("../assets/js/tools-privacy.js");
const D = require("../assets/js/tools-design.js");
const VK = require("../data/catalog.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const near = (a, b, t, m) => { ok(Math.abs(a - b) <= t, m + " (got " + a + ")"); };
const eq = (a, b, m) => { assert.strictEqual(a, b, m); pass++; };

/* ---- unit conversion ---- */
near(E.convertUnit(1, "m", "ft", "Length"), 3.28084, 1e-4, "1 m = 3.28084 ft");
near(E.convertUnit(1, "mi", "km", "Length"), 1.609344, 1e-6, "1 mi = 1.609344 km");
near(E.convertUnit(1, "kg", "lb", "Mass"), 2.20462, 1e-4, "1 kg = 2.20462 lb");
near(E.convertUnit(1, "gal", "L", "Volume"), 3.78541, 1e-4, "1 gal = 3.78541 L");
near(E.convertUnit(1024, "B", "KB", "Data"), 1, 1e-9, "1024 B = 1 KB");
near(E.convertTemp(100, "C", "F"), 212, 1e-9, "100C = 212F");
near(E.convertTemp(32, "F", "C"), 0, 1e-9, "32F = 0C");
near(E.convertTemp(0, "C", "K"), 273.15, 1e-9, "0C = 273.15K");

/* ---- age ---- */
let a = E.ageBetween("2000-01-01", "2020-01-01");
eq(a.years, 20, "20 years");
eq(a.totalDays, 7305, "days incl. 5 leap days");
a = E.ageBetween("2020-01-31", "2020-03-01");
ok(a.years === 0 && a.months >= 0, "handles month underflow without NaN");
ok(E.ageBetween("bad", "2020-01-01") === null, "bad date -> null");

/* ---- password ---- */
ok(P.makePassword(20, { lower: true, upper: true, digits: true, symbols: true }).length === 20, "password length honoured");
ok(P.makePassword(10, {}) === "", "no charset -> empty");
let pw = P.makePassword(30, { lower: true });
ok(/^[a-z]+$/.test(pw), "lower-only charset respected");
/* entropy: 12 chars, all 4 sets (pool 94) -> 12*log2(94)=78.6 -> 79 */
eq(P.passwordEntropy("aB3!aB3!aB3!"), Math.round(12 * Math.log2(94)), "entropy 12ch all-sets");
ok(P.passwordEntropy("") === 0, "empty pw entropy 0");
ok(P.strengthLabel(20).label === "Very weak" && P.strengthLabel(130).label === "Very strong", "strength labels");
ok(typeof P.crackTime(80) === "string", "crack time renders");

/* ---- AES round-trip (async) ---- */
(async () => {
  const blob = await P.encryptText("secret message", "hunter2");
  ok(blob.indexOf("VK1:") === 0, "ciphertext carries VK1 header");
  const back = await P.decryptText(blob, "hunter2");
  eq(back, "secret message", "AES round-trip recovers plaintext");
  let threw = false; try { await P.decryptText(blob, "wrong"); } catch (e) { threw = true; }
  ok(threw, "wrong passphrase throws");

  /* ---- colour maths ---- */
  eq(D.rgbToHex(37, 99, 235), "#2563eb", "rgb->hex");
  let rgb = D.hexToRgb("#2563eb");
  ok(rgb.r === 37 && rgb.g === 99 && rgb.b === 235, "hex->rgb");
  ok(D.hexToRgb("#25e") && D.hexToRgb("#2563eb") && !D.hexToRgb("nope"), "hex parse incl shorthand, rejects junk");
  let hsl = D.rgbToHsl(255, 0, 0);
  ok(hsl.h === 0 && hsl.s === 100 && hsl.l === 50, "red -> hsl(0,100,50)");
  let back2 = D.hslToRgb(0, 100, 50);
  ok(back2.r === 255 && back2.g === 0 && back2.b === 0, "hsl->rgb round-trip red");
  /* contrast: black on white is the max, 21:1 */
  eq(D.contrastRatio("#000000", "#ffffff"), 21, "black/white contrast = 21");
  ok(D.contrastRatio("#ffffff", "#ffffff") === 1, "same colour = 1:1");
  ok(D.contrastRatio("#777777", "#ffffff") >= 4.4 && D.contrastRatio("#777777", "#ffffff") <= 4.6, "grey/white ~4.5");

  /* ---- catalog: 16 tools live in right categories ---- */
  const ids = ["unit-converter","age-calculator","countdown","pomodoro","stopwatch","timezone-converter","random-picker",
    "password-generator","password-strength","text-encrypt","file-checksum",
    "color-converter","contrast-checker","gradient-generator","palette-generator","shadow-generator"];
  ids.forEach(id => { const t = VK.find(id); ok(t && t.status === "live", id + " live"); });

  console.log(`widgets2: ${pass} assertions passed`);
})();
