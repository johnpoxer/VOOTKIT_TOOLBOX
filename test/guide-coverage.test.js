/* Run after npm run build. Check the delivered guide navigation, not just
   frontmatter: every tool category needs an article and a working archive. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const VK = require('../data/catalog');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const hub = read('blog/index.html');
const sitemap = read('sitemap-blog.xml');
const posts = fs.readdirSync(path.join(root, 'content/blog'))
  .filter((f) => f.endsWith('.md') && f !== 'README.md')
  .map((file) => {
    const source = read('content/blog/' + file);
    const front = source.split('\n---\n')[0];
    return { file, source, front, slug: file.replace(/\.md$/, '') };
  }).filter((p) => !/^draft:\s*["']?true/m.test(p.front));

for (const category of VK.CATEGORIES) {
  const slug = category.slug === 'realestate' ? 'real-estate' : category.slug;
  assert(hub.includes('data-blog-filter="' + slug + '"'), `${slug}: missing hub filter`);
  const archive = read('blog/' + slug + '/index.html');
  assert(archive.includes('data-blog-card'), `${slug}: empty archive`);
  assert(!archive.includes('<meta name="robots" content="noindex,follow">'), `${slug}: populated archive noindexed`);
  assert(sitemap.includes('/blog/' + slug + '/'), `${slug}: missing sitemap entry`);
}

let localLinks = 0;
for (const post of posts) {
  const html = read('blog/' + post.slug + '/index.html');
  assert(hub.includes('/blog/' + post.slug + '/'), `${post.slug}: absent from hub`);
  assert(sitemap.includes('/blog/' + post.slug + '/'), `${post.slug}: absent from sitemap`);
  const category = /^category:\s*"([^"]+)"/m.exec(post.front);
  if (category) {
    const slug = category[1].toLowerCase().replace(/[^a-z0-9]+/g, '-');
    assert(read('blog/' + slug + '/index.html').includes('/blog/' + post.slug + '/'), `${post.slug}: missing from its primary archive`);
  }
  // Validate real authored root-relative links and covers, including cross-guide links.
  for (const match of post.source.matchAll(/\]\((\/[^\s)]+)\)|^thumbnail:\s*"(\/[^\"]+)"/gm)) {
    const target = (match[1] || match[2]).split(/[?#]/)[0];
    const file = target.endsWith('/') ? target + 'index.html' : target;
    assert(fs.existsSync(path.join(root, file)), `${post.slug}: missing ${target}`);
    localLinks++;
  }
  const articleData = Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))
    .flatMap((m) => JSON.parse(m[1]));
  assert(articleData.some((d) => d['@type'] === 'BlogPosting' || d['@type'] === 'Article'), `${post.slug}: missing article structured data`);
}
console.log(`guide coverage: ${posts.length} articles, ${VK.CATEGORIES.length} tool categories, ${localLinks} local links and covers verified`);
