'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.name.startsWith('.')||e.name==='node_modules'?[]:e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const html=walk(root).filter(p=>p.endsWith('.html'));
let checked=0;
for(const file of html){
 const s=fs.readFileSync(file,'utf8');
 assert(!/<a\b[^>]*href=["'][^"']*workflows\//i.test(s),path.relative(root,file)+' links to withdrawn workflows');
 assert(!/saved workflows|build and save reusable multi-step workflows/i.test(s),path.relative(root,file)+' advertises withdrawn workflows');checked++;
}
const retired=read('workflows/index.html');
assert(/noindex/.test(retired));assert(!/assets\/js\/(workflow|wf-init)\.js/.test(retired));
assert(!/workflows\//.test(read('sitemap-core.xml')));
assert(/from = "\/workflows\/\*"[\s\S]*?status = 302[\s\S]*?force = true/.test(read('netlify.toml')));
const bodies=new Map(),duplicates=[],near=[];
const articles=fs.readdirSync(path.join(root,'content/blog')).filter(f=>f.endsWith('.md')&&!f.startsWith('_')&&f!=='README.md').map(file=>{
 const body=read('content/blog/'+file).replace(/^---[\s\S]*?---/,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 const key=crypto.createHash('sha256').update(body).digest('hex');if(bodies.has(key))duplicates.push([bodies.get(key),file]);else bodies.set(key,file);
 const words=body.split(' '),shingles=new Set(words.slice(0,-4).map((_,i)=>words.slice(i,i+5).join(' ')));return {file,shingles};
});
for(let i=0;i<articles.length;i++)for(let j=i+1;j<articles.length;j++){
 const a=articles[i],b=articles[j],common=[...a.shingles].filter(s=>b.shingles.has(s)).length,score=common/(a.shingles.size+b.shingles.size-common);
 if(score>=0.65)near.push({files:[a.file,b.file],similarity:Number(score.toFixed(3))});
}
assert.deepEqual(duplicates,[],'identical article bodies need consolidation');
const homepage=read('index.html'),stock=[...homepage.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(m=>m[1]).filter(p=>/\.(jpg|jpeg|webp|avif|png)$/i.test(p));
const photos=new Map(),duplicatePhotos=[];
for(const src of stock){const file=path.join(root,src.replace(/^\//,''));if(!fs.existsSync(file))continue;const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');if(photos.has(hash))duplicatePhotos.push([photos.get(hash),src]);else photos.set(hash,src);}
assert.deepEqual(duplicatePhotos,[],'homepage repeats the same raster image');
const report={date:'2026-11-06',htmlPagesChecked:checked,articlesChecked:articles.length,identicalArticleBodies:duplicates,similarArticlePairsForReview:near,duplicateHomepageImages:duplicatePhotos,scope:'Internal duplication and withdrawal checks; not external plagiarism detection, full tool certification or Google approval.'};
fs.writeFileSync(path.join(root,'docs/SITE_QUALITY_REVIEW.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
