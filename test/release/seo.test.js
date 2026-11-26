import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const read = (file) => readFile(path.join(root, file), 'utf8');

const pages = [
  { file: 'web/landing.html', url: 'https://playpokergym.com/', types: ['Organization', 'WebSite', 'WebApplication', 'FAQPage'] },
  { file: 'web/index.html', url: 'https://playpokergym.com/web/', types: ['Organization', 'WebSite', 'WebApplication'] },
  { file: 'web/privacy.html', url: 'https://playpokergym.com/web/privacy', types: ['Organization', 'WebSite', 'WebPage'] },
  { file: 'web/about.html', url: 'https://playpokergym.com/about/', types: ['Organization', 'WebSite', 'AboutPage', 'BreadcrumbList'] },
  { file: 'public/guides/blackjack/index.html', url: 'https://playpokergym.com/guides/blackjack/', types: ['Article', 'BreadcrumbList', 'FAQPage', 'LearningResource'] },
  { file: 'public/guides/jacks-or-better/index.html', url: 'https://playpokergym.com/guides/jacks-or-better/', types: ['Article', 'BreadcrumbList', 'FAQPage', 'LearningResource'] },
  { file: 'public/guides/baccarat/index.html', url: 'https://playpokergym.com/guides/baccarat/', types: ['Article', 'BreadcrumbList', 'FAQPage', 'LearningResource'] },
  { file: 'public/guides/holdem-best-five/index.html', url: 'https://playpokergym.com/guides/holdem-best-five/', types: ['Article', 'BreadcrumbList', 'FAQPage', 'LearningResource'] },
  { file: 'public/guides/weekly-01/index.html', url: 'https://playpokergym.com/guides/weekly-01/', types: ['Article', 'BreadcrumbList', 'FAQPage', 'LearningResource'] },
];

const meta = (html, attr, name) => {
  const re = new RegExp(`<meta\\s+${attr}=["']${name}["']\\s+content=["']([^"']*)["']`, 'i');
  return re.exec(html)?.[1] ?? '';
};

const link = (html, rel) => {
  const re = new RegExp(`<link\\s+rel=["']${rel}["']\\s+href=["']([^"']*)["']`, 'i');
  return re.exec(html)?.[1] ?? '';
};

function jsonLd(html) {
  return [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)]
    .map((m) => JSON.parse(m[1]))
    .flatMap((node) => node['@graph'] ?? [node]);
}

test('every public page carries the discoverability basics', async () => {
  for (const page of pages) {
    const html = await read(page.file);
    assert.match(html, /<html\s+lang=["']en["']/i, `${page.file}: html lang`);
    assert.match(html, /<title>[^<]{10,}<\/title>/i, `${page.file}: title`);
    assert.ok(meta(html, 'name', 'description').length >= 50, `${page.file}: description`);
    assert.equal(link(html, 'canonical'), page.url, `${page.file}: canonical`);
    assert.match(meta(html, 'name', 'robots'), /index/, `${page.file}: indexable`);
    assert.doesNotMatch(meta(html, 'name', 'robots'), /noindex/, `${page.file}: no noindex`);
    assert.ok(meta(html, 'property', 'og:title'), `${page.file}: og:title`);
    assert.ok(meta(html, 'property', 'og:description'), `${page.file}: og:description`);
    assert.ok(meta(html, 'property', 'og:url'), `${page.file}: og:url`);
    assert.equal(meta(html, 'property', 'og:image'), 'https://playpokergym.com/og.png', `${page.file}: og:image`);
    assert.equal(meta(html, 'name', 'twitter:card'), 'summary_large_image', `${page.file}: twitter card`);
    assert.equal((html.match(/<h1[\s>]/gi) ?? []).length, 1, `${page.file}: exactly one h1`);
    assert.ok(html.includes('application/ld+json'), `${page.file}: structured data`);
  }
});

test('the public brand is Play Poker Gym with Poker Gym as the short form', async () => {
  for (const page of pages) {
    const html = await read(page.file);
    assert.match(html, /<title>[^<]*Play Poker Gym[^<]*<\/title>/i, `${page.file}: title brand`);
    assert.equal(meta(html, 'property', 'og:site_name'), 'Play Poker Gym', `${page.file}: og:site_name`);
    const org = jsonLd(html).find((node) => node['@type'] === 'Organization');
    assert.ok(org, `${page.file}: Organization`);
    assert.equal(org.name, 'Play Poker Gym', `${page.file}: Organization name`);
    assert.equal(org.alternateName, 'Poker Gym', `${page.file}: short-form alternateName`);
  }
});

test('structured data parses and declares the expected entities', async () => {
  for (const page of pages) {
    const nodes = jsonLd(await read(page.file));
    assert.ok(nodes.length > 0, `${page.file}: nodes`);
    for (const type of page.types) {
      assert.ok(nodes.some((node) => node['@type'] === type), `${page.file}: ${type}`);
    }
    for (const node of nodes) {
      assert.ok(node['@type'], `${page.file}: node type`);
    }
  }
});

test('guide FAQ markup answers the visible questions', async () => {
  for (const page of pages.filter((p) => p.file.startsWith('public/guides/'))) {
    const html = await read(page.file);
    const faq = jsonLd(html).find((node) => node['@type'] === 'FAQPage');
    const visible = [...html.matchAll(/<h2>(\d+\.[\s\S]*?)<\/h2>/gi)].map((m) => m[1]);
    assert.ok(faq.mainEntity.length >= 3, `${page.file}: FAQ answers`);
    assert.equal(faq.mainEntity.length, visible.length, `${page.file}: visible questions match schema`);
    for (const question of faq.mainEntity) {
      assert.ok(question.name.length > 5, `${page.file}: question name`);
      assert.ok(question.acceptedAnswer.text.length > 20, `${page.file}: answer text`);
    }
  }
});

test('the landing FAQ is visible and matches its FAQPage schema', async () => {
  const html = await read('web/landing.html');
  const faq = jsonLd(html).find((node) => node['@type'] === 'FAQPage');
  const visible = [...html.matchAll(/<details><summary>([\s\S]*?)<\/summary>/gi)].map((m) => m[1]);
  assert.equal(faq.mainEntity.length, visible.length);
  assert.deepEqual(faq.mainEntity.map((q) => q.name), visible);
});

test('crawler policy welcomes search and AI assistants', async () => {
  const robots = await read('public/robots.txt');
  assert.match(robots, /User-agent: \*\nAllow: \//);
  for (const bot of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'cohere-ai']) {
    assert.match(robots, new RegExp(`User-agent: ${bot}\\nAllow: /`), bot);
  }
  assert.match(robots, /Sitemap: https:\/\/playpokergym\.com\/sitemap\.xml/);
  assert.match(robots, /llms\.txt/);
});

test('the sitemap lists every public page with a lastmod date', async () => {
  const xml = await read('public/sitemap.xml');
  for (const page of pages) {
    assert.ok(xml.includes(`<loc>${page.url}</loc>`), `${page.file}: sitemap`);
  }
  const lastmodCount = (xml.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) ?? []).length;
  const urlCount = (xml.match(/<url>/g) ?? []).length;
  assert.equal(lastmodCount, urlCount);
  assert.ok(lastmodCount >= pages.length);
  assert.doesNotMatch(xml, /noindex|<url><loc>[^<]*<\/loc><\/url>/);
});

test('llms.txt is a concise, linked guide for assistants', async () => {
  const text = await read('public/llms.txt');
  assert.match(text, /^# Play Poker Gym/);
  assert.match(text, /^> /m);
  assert.match(text, /https:\/\/playpokergym\.com\/web\//);
  assert.match(text, /https:\/\/playpokergym\.com\/guides\/blackjack\//);
  assert.match(text, /https:\/\/playpokergym\.com\/llms-full\.txt/);
  assert.match(text, /Last updated: \d{4}-\d{2}-\d{2}/);
  assert.ok(text.length < 10000, 'keep llms.txt scannable');
});

test('llms-full.txt expands the facts and links back', async () => {
  const text = await read('public/llms-full.txt');
  assert.match(text, /^# Play Poker Gym — full text for assistants/);
  assert.match(text, /## Games/);
  assert.match(text, /## FAQ/);
  assert.match(text, /Last updated: \d{4}-\d{2}-\d{2}/);
});

test('the build publishes the crawler files', async () => {
  const build = await read('scripts/build.mjs');
  for (const file of ['robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt']) {
    assert.match(build, new RegExp(file.replace('.', '\\.')), file);
  }
});

test('meta descriptions fit the 25–160 characters search engines show', async () => {
  const { readdir } = await import('node:fs/promises');
  const guides = (await readdir(path.join(root, 'public/guides'), { withFileTypes: true }))
    .filter((d) => d.isDirectory()).map((d) => `public/guides/${d.name}/index.html`);
  const files = ['web/landing.html', 'web/index.html', 'web/privacy.html', 'web/about.html', 'public/guides/index.html', ...guides];
  for (const file of files) {
    const html = await read(file);
    const raw = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html)?.[1] ?? '';
    const text = raw.replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    assert.ok(text.length >= 25 && text.length <= 160, `${file}: description is ${text.length} characters`);
  }
});

test('the guide hub targets search words and declares its list and breadcrumb', async () => {
  const html = await read('public/guides/index.html');
  assert.match(html, /<title>Casino Strategy Guides: Blackjack, Video Poker &amp; Baccarat<\/title>/);
  assert.match(html, /<h1>Casino Strategy Guides: Blackjack, Video Poker &amp; Baccarat<\/h1>/);
  const nodes = jsonLd(html);
  const list = nodes.find((node) => node['@type'] === 'CollectionPage')?.mainEntity;
  assert.equal(list?.['@type'], 'ItemList');
  const linked = new Set([...html.matchAll(/<li><a href="(\/guides\/[^"]+\/)"/g)].map((m) => `https://playpokergym.com${m[1]}`));
  assert.equal(list.itemListElement.length, linked.size, 'ItemList covers every guide on the hub');
  for (const item of list.itemListElement) assert.ok(linked.has(item.url), `${item.url} is linked on the hub`);
  assert.ok(nodes.some((node) => node['@type'] === 'BreadcrumbList'), 'BreadcrumbList');
});

test('guide titles fit in a search result (65 characters or fewer)', async () => {
  const { readdir } = await import('node:fs/promises');
  const guides = (await readdir(path.join(root, 'public/guides'), { withFileTypes: true }))
    .filter((d) => d.isDirectory()).map((d) => `public/guides/${d.name}/index.html`);
  for (const file of ['public/guides/index.html', ...guides]) {
    const raw = /<title>([^<]*)<\/title>/.exec(await read(file))?.[1] ?? '';
    const text = raw.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    assert.ok(text.length <= 65, `${file}: title is ${text.length} characters`);
  }
});

test('13 vs 2 FAQ gives the basic-strategy answer on the page and in FAQPage markup', async () => {
  const html = await read('public/guides/blackjack-13-vs-2-stand/index.html');
  const faq = jsonLd(html).find((node) => node['@type'] === 'FAQPage');
  const answer = faq.mainEntity.find((q) => q.name === 'Do you hit 13 against a 2?').acceptedAnswer.text;
  assert.match(answer, /Stand on hard 13 against a dealer 2 through 6, and hit it against 7 through ace/);
  assert.ok(html.includes(`<p>${answer}</p>`), 'visible answer matches the markup');
});

test('position 6-9 blackjack guides answer in the title and carry the depth sections', async () => {
  const pages = {
    'blackjack-16-vs-10-hit': [/^Hit 16 vs Dealer 10 in Blackjack\? Yes/, /^Yes, hit hard 16/, '<td><strong>Hit</strong></td>'],
    'blackjack-11-vs-10-double': [/^Double 11 vs Dealer 10 in Blackjack\? Yes/, /^Yes, double 11/, '<td><strong>Double</strong></td>'],
    'blackjack-10-vs-9-double': [/^Double 10 vs Dealer 9 in Blackjack\? Yes/, /^Yes, double 10/, '<td><strong>Double</strong></td>'],
    'blackjack-1010-vs-6-stand': [/^Split 10s vs Dealer 6 in Blackjack\? No/, /^No, never split 10s/, '<td><strong>Stand</strong></td>'],
  };
  const decode = (t) => t.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  for (const [slug, [title, description, cell]] of Object.entries(pages)) {
    const html = await read(`public/guides/${slug}/index.html`);
    assert.match(decode(/<title>([^<]*)<\/title>/.exec(html)[1]), title, `${slug}: title`);
    assert.match(decode(meta(html, 'name', 'description')), description, `${slug}: description`);
    for (const heading of ['against every dealer upcard</h2>', '<h2>Rules this answer assumes</h2>', '<h2>What changes the answer</h2>', '<h2>Practice it</h2>']) {
      assert.ok(html.includes(heading), `${slug}: ${heading}`);
    }
    assert.ok(html.includes(cell), `${slug}: highlighted chart cell`);
    assert.ok(html.includes('href="/web/?practice=blackjack&amp;ref=guide"'), `${slug}: trainer link`);
    const words = html.replace(/[\s\S]*<main[^>]*>|<\/main>[\s\S]*/g, '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 450, `${slug}: ${words} words`);
    const faq = jsonLd(html).find((node) => node['@type'] === 'FAQPage');
    assert.ok(faq.mainEntity.length >= 3, `${slug}: FAQ count`);
    for (const q of faq.mainEntity) {
      const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      assert.ok(html.includes(`<h3>${esc(q.name)}</h3>\n<p>${esc(q.acceptedAnswer.text)}</p>`), `${slug}: visible FAQ matches markup: ${q.name}`);
    }
    const article = jsonLd(html).find((node) => node['@type'] === 'Article');
    assert.equal(article.dateModified, '2026-11-23', `${slug}: dateModified`);
  }
});

test('the homepage body links popular strategy questions to live guides', async () => {
  const html = await read('web/landing.html');
  const sitemap = await read('public/sitemap.xml');
  const start = html.indexOf('<section class="wrap" id="popular-questions"');
  assert.ok(start > 0, 'popular-questions section present');
  const block = html.slice(start, html.indexOf('</section>', start));
  assert.match(block, /<h2 id="questions-heading">Popular strategy questions<\/h2>/);
  const links = [...block.matchAll(/<li><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/li>/g)];
  assert.ok(links.length >= 6 && links.length <= 8, `6-8 question links, got ${links.length}`);
  for (const [, href, text] of links) {
    assert.match(href, /^\/guides\/[a-z0-9-]+\/$/, `${href}: guide URL`);
    assert.ok(sitemap.includes(`<loc>https://playpokergym.com${href}</loc>`), `${href} is in the sitemap`);
    assert.match(text, /\?$/, `${href}: question-style anchor`);
  }
  assert.match(block, /<a href="\/guides\/"[^>]*>See every strategy guide/);
});

test('every /guides/ hub section opens with an intro', async () => {
  const html = await read('public/guides/index.html');
  const sections = [...html.matchAll(/<section class="game-card"><h2>([^<]+)<\/h2>([\s\S]*?)<\/section>/g)];
  assert.ok(sections.length >= 5, 'five game sections');
  const intros = new Set();
  for (const [, name, body] of sections) {
    const intro = /<p class="intro">([^<]+)<\/p>/.exec(body)?.[1] ?? '';
    const words = intro.split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 15 && words <= 60, `${name}: intro of 1-2 sentences (${words} words)`);
    assert.ok(body.indexOf('class="intro"') < body.indexOf('<ul class="links">'), `${name}: intro sits above the links`);
    intros.add(intro);
  }
  assert.equal(intros.size, sections.length, 'each intro is unique');
});

test('the /about/ page explains who builds the site and how answers are computed, and every guide links to it', async () => {
  const { readdir } = await import('node:fs/promises');
  const html = await read('web/about.html');
  const sitemap = await read('public/sitemap.xml');
  assert.match(sitemap, /<url><loc>https:\/\/playpokergym\.com\/about\/<\/loc><lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, 'About is in the sitemap with a lastmod');
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
  assert.equal(title, 'About Play Poker Gym: How the Strategy Answers Are Computed');
  assert.ok(title.length <= 65, `title is ${title.length} characters`);
  assert.match(html, /<h1>About Play Poker Gym<\/h1>/);
  assert.equal(link(html, 'canonical'), 'https://playpokergym.com/about/');
  const nodes = jsonLd(html);
  const about = nodes.find((node) => node['@type'] === 'AboutPage');
  assert.equal(about?.url, 'https://playpokergym.com/about/');
  assert.equal(about.about['@id'], 'https://playpokergym.com/#organization');
  assert.equal(about.breadcrumb['@id'], nodes.find((node) => node['@type'] === 'BreadcrumbList')['@id']);
  assert.ok(!nodes.some((node) => /Review|AggregateRating/.test(node['@type'])), 'no review or rating markup');
  for (const heading of ['Who builds it', 'How the answers are computed', 'Rules the answers assume', 'Free, with no signup', 'Play responsibly']) {
    assert.ok(html.includes(`<h2>${heading}</h2>`), `section: ${heading}`);
  }
  assert.match(await read('public/llms.txt'), /https:\/\/playpokergym\.com\/about\//, 'llms.txt lists About');
  const guides = (await readdir(path.join(root, 'public/guides'), { withFileTypes: true }))
    .filter((d) => d.isDirectory()).map((d) => `public/guides/${d.name}/index.html`);
  for (const file of ['public/guides/index.html', 'web/landing.html', 'web/privacy.html', ...guides]) {
    const page = await read(file);
    const footer = page.slice(page.lastIndexOf('<footer'), page.lastIndexOf('</footer>'));
    assert.ok(footer.includes('href="/about/"'), `${file}: footer links /about/`);
  }
});

test('each game hub links every guide of its game with the question as the anchor', async () => {
  const { scenarios } = await import('../../scripts/scenarios.mjs');
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // Game by slug, independent of scripts/guide-families.mjs, so a guide left out
  // of a family list still has to reach its hub.
  const hubs = {
    'public/guides/blackjack/index.html': (slug) => slug.startsWith('blackjack-') || slug.startsWith('free-blackjack-'),
    'public/guides/jacks-or-better/index.html': (slug) => slug.startsWith('video-poker-') || slug === 'free-video-poker-trainer',
    'public/guides/baccarat/index.html': (slug) => slug.startsWith('baccarat-') || slug === 'free-baccarat-practice',
    'public/guides/holdem-best-five/index.html': (slug) => slug.startsWith('holdem-') || slug === 'free-holdem-trainer',
  };
  for (const [file, inGame] of Object.entries(hubs)) {
    const html = await read(file);
    const start = html.indexOf('<!-- guide-index:start');
    const end = html.indexOf('<!-- guide-index:end -->');
    assert.ok(start > 0 && end > start, `${file}: generated guide index present`);
    const block = html.slice(start, end);
    const guides = scenarios.filter((s) => inGame(s.slug));
    assert.ok(guides.length >= 6, `${file}: has guides`);
    for (const s of guides) {
      assert.ok(block.includes(`<a href="/guides/${s.slug}/">${esc(s.title)}</a>`), `${file}: links ${s.slug} with its question`);
    }
    for (const [, text] of block.matchAll(/<li><a href="\/guides\/[^"]+\/">([^<]+)<\/a><\/li>/g)) {
      assert.doesNotMatch(text, /^(read more|more|click here|here|guide)$/i, `${file}: descriptive anchor`);
    }
  }
});

test('every sitemap guide has at least 3 inbound contextual links from other guides or hubs', async () => {
  const sitemap = await read('public/sitemap.xml');
  const base = 'https://playpokergym.com';
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].slice(base.length));
  const sources = urls.filter((u) => u.startsWith('/guides/'));
  const inbound = new Map(urls.map((u) => [u, new Set()]));
  for (const src of sources) {
    // Shared nav and footer are the same on every page, so they don't count.
    const html = (await read(`public${src}index.html`))
      .replace(/<head>[\s\S]*?<\/head>/, '')
      .replace(/<header class="pg-header">[\s\S]*?<\/header>/g, '')
      .replace(/<footer class="pg-footer">[\s\S]*?<\/footer>/g, '');
    for (const [, href] of html.matchAll(/<a\b[^>]*href="([^"#?]+)/g)) {
      const target = href.startsWith(base) ? href.slice(base.length) : href;
      if (target !== src && inbound.has(target)) inbound.get(target).add(src);
    }
  }
  for (const url of sources.filter((u) => u !== '/guides/')) {
    assert.ok(inbound.get(url).size >= 3, `${url}: ${inbound.get(url).size} inbound links from other guides (${[...inbound.get(url)].join(', ')})`);
  }
});

test('related decisions stay in the same game and every decision guide links up to its hub', async () => {
  const { scenarios } = await import('../../scripts/scenarios.mjs');
  const game = (slug) => slug.startsWith('blackjack-') || slug.startsWith('free-blackjack-') ? 'blackjack'
    : slug.startsWith('video-poker-') || slug === 'free-video-poker-trainer' ? 'videopoker'
    : slug.startsWith('baccarat-') || slug === 'free-baccarat-practice' ? 'baccarat'
    : slug.startsWith('holdem-') || slug === 'free-holdem-trainer' ? 'holdem' : null;
  const hub = { blackjack: '/guides/blackjack/', videopoker: '/guides/jacks-or-better/', baccarat: '/guides/baccarat/', holdem: '/guides/holdem-best-five/' };
  for (const s of scenarios) {
    const html = await read(`public/guides/${s.slug}/index.html`);
    const aside = html.slice(html.indexOf('<h2>Related decisions</h2>'), html.indexOf('</aside>'));
    const related = [...aside.matchAll(/<li><a href="\/guides\/([^/]+)\/">/g)].map((m) => m[1]);
    assert.ok(related.length >= 3 && related.length <= 5, `${s.slug}: 3-5 related decisions (${related.length})`);
    const g = game(s.slug);
    for (const other of related) {
      assert.notEqual(other, s.slug, `${s.slug}: no self link`);
      if (g) assert.ok(game(other) === g || game(other) === null, `${s.slug}: related ${other} is the same game`);
    }
    if (g) assert.ok(aside.includes(`<a href="${hub[g]}">`), `${s.slug}: links up to ${hub[g]}`);
    if (g === 'blackjack' && s.slug !== 'blackjack-basic-strategy-trainer') {
      assert.ok(aside.includes('<a href="/guides/blackjack-basic-strategy-trainer/">'), `${s.slug}: links the basic strategy trainer page`);
    }
  }
  // Hand families link each other: every hard 12-17 stiff hand links at least
  // three other stiff hands, and the same for splits and video poker holds.
  const families = {
    stiff: ['blackjack-12-vs-2-hit', 'blackjack-13-vs-2-stand', 'blackjack-15-vs-10-hit', 'blackjack-16-vs-10-hit', 'blackjack-17-vs-10-stand'],
    doubles: ['blackjack-9-vs-2-hit', 'blackjack-10-vs-9-double', 'blackjack-11-vs-10-double', 'blackjack-11-vs-ace-hit'],
    splits: ['blackjack-aces-vs-10-split', 'blackjack-22-vs-9-hit', 'blackjack-44-vs-5-split', 'blackjack-88-vs-10-split', 'blackjack-99-vs-7-stand'],
    holds: ['video-poker-nothing-hand-hold', 'video-poker-low-pair-or-three-to-a-royal', 'video-poker-four-to-a-flush-vs-low-pair', 'video-poker-two-pair-hold-both'],
    odds: ['holdem-flush-draw-odds-by-the-river', 'holdem-flush-draw-turn-odds', 'holdem-open-ended-straight-draw-odds', 'holdem-gutshot-odds'],
  };
  for (const [name, slugs] of Object.entries(families)) {
    for (const slug of slugs) {
      const html = await read(`public/guides/${slug}/index.html`);
      const aside = html.slice(html.indexOf('<h2>Related decisions</h2>'), html.indexOf('</aside>'));
      const hits = slugs.filter((o) => o !== slug && aside.includes(`href="/guides/${o}/"`)).length;
      assert.ok(hits >= Math.min(3, slugs.length - 1), `${slug}: links ${hits} other ${name} guides`);
    }
  }
});
