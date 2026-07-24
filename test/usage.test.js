/* usage.test.js — the free-limit decision logic (pure). */
"use strict";
const assert = require("assert");
global.window = global;
const U = require("../assets/js/usage.js");
let pass = 0; const eq=(a,b,m)=>{assert.strictEqual(a,b,m);pass++;};
const base = { enabled: true, pro: false, exempt: false, count: 0, count_limit: 5, hard: true };
function d(o){ return U.decide(Object.assign({}, base, o)); }
eq(d({enabled:false}), "allow", "disabled -> always allow");
eq(d({pro:true, count:99}), "allow", "pro exempt regardless of count");
eq(d({exempt:true, count:99}), "allow", "exempt category always allowed");
eq(d({count:0}), "allow", "under limit allowed");
eq(d({count:4}), "allow", "at limit-1 allowed (5th use)");
eq(d({count:5}), "block", "at limit, hard -> block");
eq(d({count:9}), "block", "over limit -> block");
eq(d({count:5, hard:false}), "nudge", "at limit, soft -> nudge");
eq(d({count:5, pro:true}), "allow", "pro beats hard block");
console.log(`usage: ${pass} assertions passed`);
