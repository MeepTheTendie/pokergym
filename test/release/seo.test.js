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
