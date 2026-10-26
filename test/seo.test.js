import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => readFile(path.join(root, file), 'utf8');

const pages = [
  { file: 'web/landing.html', url: 'https://playpokergym.com/', types: ['Organization', 'WebSite', 'WebApplication', 'FAQPage'] },
  { file: 'web/index.html', url: 'https://playpokergym.com/web/', types: ['Organization', 'WebSite', 'WebApplication'] },
  { file: 'web/privacy.html', url: 'https://playpokergym.com/web/privacy.html', types: ['Organization', 'WebSite', 'WebPage'] },
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
  assert.equal((xml.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) ?? []).length, pages.length);
  assert.doesNotMatch(xml, /noindex|<url><loc>[^<]*<\/loc><\/url>/);
});

test('llms.txt is a concise, linked guide for assistants', async () => {
  const text = await read('public/llms.txt');
  assert.match(text, /^# Poker Gym/);
  assert.match(text, /^> /m);
  assert.match(text, /https:\/\/playpokergym\.com\/web\//);
  assert.match(text, /https:\/\/playpokergym\.com\/guides\/blackjack\//);
  assert.match(text, /https:\/\/playpokergym\.com\/llms-full\.txt/);
  assert.match(text, /Last updated: \d{4}-\d{2}-\d{2}/);
  assert.ok(text.length < 6000, 'keep llms.txt scannable');
});

test('llms-full.txt expands the facts and links back', async () => {
  const text = await read('public/llms-full.txt');
  assert.match(text, /^# Poker Gym — full text for assistants/);
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
