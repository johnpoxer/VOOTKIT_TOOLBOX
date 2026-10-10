"use strict";
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),report=require('../docs/EDITORIAL_REVIEW.json');
const copy=require('../data/tool-content.js');
const normal=s=>s.replace(/<[^>]*>/g,' ').replace(/[^a-z0-9 ]/gi,' ').replace(/\s+/g,' ').toLowerCase().trim();
const strings=v=>typeof v==='string'?[v]:v&&typeof v==='object'?Object.values(v).flatMap(strings):[];
let checks=0;
const bodies=new Set(),missing=[],overlap=[];
const articles=fs.readdirSync(path.join(root,'content/blog')).filter(f=>f.endsWith('.md')&&!f.startsWith('_')&&f!=='README.md');
for(const file of articles){
 const source=fs.readFileSync(path.join(root,'content/blog',file),'utf8'),body=source.replace(/^---[\s\S]*?---/,'');
 const n=normal(body);assert(!bodies.has(n),file+' duplicates another article');bodies.add(n);checks++;
 for(const match of body.matchAll(/\]\((\/[^)#?]+)(?:[?#][^)]*)?\)/g)){
  const p=path.join(root,match[1]);
  if(![p,p+'.html',path.join(p,'index.html')].some(f=>fs.existsSync(f)))missing.push({file,ref:match[1]});checks++;
 }
 const id=file.replace(/-guide\.md$/,'');
 for(const s of strings(copy[id]||{})){const normalized=normal(s);if(normalized.split(' ').length>=20&&n.includes(normalized))overlap.push({file,id});}
}
assert.deepEqual(missing,[],'article links must resolve');
assert.deepEqual(overlap,[],'articles must add value beyond copied tool prose');
fs.writeFileSync(path.join(root,'docs/CONTENT_AUDIT.json'),JSON.stringify({date:'2026-10-10',articles:articles.length,identicalBodies:0,toolProseOverlap:overlap,missingLocalLinks:missing,toolsWithSpecificCopy:Object.keys(copy).length,totalTools:require('../data/catalog.js').TOOLS.length,scope:'Structural and internal-overlap audit, not proof of external originality or currentness of every third-party claim.'},null,2)+'\n');
for(const g of report.guides){
 const text=fs.readFileSync(path.join(root,g.file),'utf8'),body=normal(text.replace(/^---[\s\S]*?---/,''));
 for(const source of strings(copy[g.id]||{})){
  const n=normal(source);if(n.split(' ').length>=20){assert(!body.includes(n),g.id+' repeats tool-page prose');checks++;}
 }
 assert(text.includes('## A practical example')&&text.includes('## Check the result')&&text.includes('## What this does not establish'),g.id+' lacks its example, check or scope');checks++;
 const built=fs.readFileSync(path.join(root,'blog',g.id+'-guide','index.html'),'utf8');
 assert(built.includes('dateModified')&&built.includes('2026-10-10'),g.id+' loses its real modification date');checks++;
}
global.window=global;
const math=require('../assets/js/tools-mathdate.js');
assert.equal(math.evalExpr('120 * (1 + 0.15)'),138);
assert.equal(math.evalExpr('-3^2'),-9);
assert.equal(math.evalExpr('(-3)^2'),9);
assert.equal(math.evalExpr('2^-2'),0.25);
assert.equal(math.evalExpr('2^3^2'),512);
assert.throws(()=>math.evalExpr('1/0'),/finite/);
assert.deepEqual(math.solveQuad(1,-5,6).roots.sort(),[2,3]);
const calc=require('../assets/js/calc.js');
const video=require('../assets/js/tools-video.js');
assert.equal(video['bitrate-calculator'].compute({mins:1,size:10,audio:128}).headline.value,'1,232 kbps');
assert.equal(video['bitrate-calculator'].compute({mins:0.5,size:10,audio:128}).headline.value,'2,588 kbps');
// Money modules depend on the shared formatter, as in the browser.
const money=require('../assets/js/tools-money2.js');
const net=money['paycheck-calculator'].compute({gross:40000,pension:5,taxRate:10,social:5,other:0,periods:12,cur:'USD'});
assert(net.headline.sub.includes('32,200'),'paycheck example disagrees with actual calculator');
const leave=money['pto-accrual'].compute({entitlement:24,worked:3,taken:3,carried:2});
assert.equal(leave.headline.value,'5 days');
const salary=require('../assets/js/tools-misc.js');
assert.equal(salary.salaryConvert(25,'hour',40,52).year,52000);
console.log('editorial: '+(checks+12)+' content and example checks passed');
