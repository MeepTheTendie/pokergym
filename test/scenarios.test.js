import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { scenarios } from '../scripts/scenarios.mjs';

const root = new URL('..', import.meta.url).pathname;
const page = slug => `${root}public/guides/${slug}/index.html`;
const sitemap = readFileSync(`${root}public/sitemap.xml`, 'utf8');
const llms = readFileSync(`${root}public/llms.txt`, 'utf8');
const llmsFull = readFileSync(`${root}public/llms-full.txt`, 'utf8');

test('every scenario has a page, a sitemap entry and an assistant entry', () => {
  assert.ok(scenarios.length >= 20);
  const slugs = new Set();
  for (const s of scenarios) {
    assert.ok(!slugs.has(s.slug), `duplicate slug ${s.slug}`);
    slugs.add(s.slug);
    assert.ok(existsSync(page(s.slug)), `missing page ${s.slug}`);
    assert.match(sitemap, new RegExp(`/guides/${s.slug}/`), `missing sitemap ${s.slug}`);
    assert.match(llms, new RegExp(`/guides/${s.slug}/`), `missing llms ${s.slug}`);
    assert.match(llmsFull, new RegExp(`/guides/${s.slug}/`), `missing llms-full ${s.slug}`);
    assert.ok(s.answer.length > 2, s.slug);
    assert.ok(s.why.length >= 2, s.slug);
    assert.ok(s.faq.length >= 2, s.slug);
  }
});

test('every internal guide link resolves and no page links to itself', () => {
  for (const s of scenarios) {
    const html = readFileSync(page(s.slug), 'utf8');
    const links = [...html.matchAll(/href="\/guides\/([^"#]+)\/"/g)].map(m => m[1]);
    for (const target of links) {
      assert.ok(existsSync(page(target)), `${s.slug} links to missing ${target}`);
    }
    const related = s.related.map(([slug]) => slug);
    assert.ok(!related.includes(s.slug), `${s.slug} links to itself`);
  }
});

test('the guide hub lists every scenario', () => {
  const hub = readFileSync(`${root}public/guides/index.html`, 'utf8');
  for (const s of scenarios) assert.match(hub, new RegExp(`/guides/${s.slug}/`), s.slug);
});
