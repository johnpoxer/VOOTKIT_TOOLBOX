/* dataimg.test.js — CSV/JSON parsing + colour quantisation + EXIF parser. */
"use strict";
const assert = require("assert");
global.window = global;
const DA = require("../assets/js/tools-data.js");
const IM = require("../assets/js/tools-imaging.js");
const VK = require("../data/catalog.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); pass++; };

/* ---- CSV parse ---- */
eq(DA.parseCsv("a,b,c\n1,2,3"), [["a", "b", "c"], ["1", "2", "3"]], "basic csv");
eq(DA.parseCsv('name,note\n"Smith, Jr.","said ""hi"""'), [["name", "note"], ["Smith, Jr.", 'said "hi"']], "quoted commas + escaped quotes");
eq(DA.parseCsv('a\n"line1\nline2"'), [["a"], ["line1\nline2"]], "newline inside quotes");
eq(DA.parseCsv("a,b\n1,2\n"), [["a", "b"], ["1", "2"]], "trailing newline dropped");
eq(DA.parseCsv("a\tb\n1\t2", "\t"), [["a", "b"], ["1", "2"]], "tab delimiter");

/* ---- toCsv round-trip ---- */
let rows = [["name", "note"], ["Smith, Jr.", 'said "hi"'], ["plain", "ok"]];
let csv = DA.toCsv(rows);
ok(csv.indexOf('"Smith, Jr."') !== -1, "quotes fields with commas");
ok(csv.indexOf('""hi""') !== -1, "escapes inner quotes");
eq(DA.parseCsv(csv), rows, "toCsv -> parseCsv round-trips");

/* ---- JSON <-> rows ---- */
let arr = [{ name: "Ada", role: "Eng" }, { name: "Grace", role: "Admiral", rank: 4 }];
let r2 = DA.jsonToRows(arr);
eq(r2[0], ["name", "role", "rank"], "union of keys as header");
eq(r2[1], ["Ada", "Eng", ""], "missing key -> empty");
eq(r2[2], ["Grace", "Admiral", "4"], "value stringified");
assert.throws(() => DA.jsonToRows({ not: "array" }), "non-array throws"); pass++;
let back = DA.rowsToJson([["a", "b"], ["1", "2"]]);
eq(back, [{ a: "1", b: "2" }], "rowsToJson");
/* nested object -> JSON string cell */
eq(DA.jsonToRows([{ x: { y: 1 } }])[1], ['{"y":1}'], "nested object serialised");

/* ---- colour quantisation ---- */
// build a fake RGBA buffer: 3 red + 1 blue pixels
let px = new Uint8ClampedArray([255,0,0,255, 255,0,0,255, 255,0,0,255, 0,0,255,255]);
let q = IM.quantizeColors(px, 4);
ok(q[0].r > 200 && q[0].g < 40 && q[0].b < 40, "dominant colour is red");
ok(q.length === 2, "two distinct buckets");
ok(q[0].n === 3 && q[1].n === 1, "counts by frequency");
eq(IM.toHex(255, 0, 0), "#ff0000", "toHex red");
eq(IM.toHex(37, 99, 235), "#2563eb", "toHex brand blue");
/* transparent pixels skipped */
let pxt = new Uint8ClampedArray([0,0,0,0, 255,255,255,255]);
ok(IM.quantizeColors(pxt, 4).length === 1, "transparent pixel ignored");

/* ---- EXIF: rejects a non-JPEG buffer cleanly ---- */
let png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 0]).buffer;
ok(IM.parseExif(png).error, "non-JPEG flagged, not crashed");
/* minimal JPEG SOI + EOI, no EXIF -> note, no throw */
let jpg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9]).buffer;
let ex = IM.parseExif(jpg);
ok(!ex.error && ex.tags && Object.keys(ex.tags).length === 0, "JPEG w/o EXIF -> empty tags, no error");

/* ---- catalog ---- */
["csv-viewer","json-csv","exif-viewer","color-from-image","meme-generator"].forEach(id => {
  const t = VK.find(id); ok(t && t.status === "live", id + " live");
});

console.log(`dataimg: ${pass} assertions passed`);
