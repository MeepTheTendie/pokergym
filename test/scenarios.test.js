import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scenarios } from '../scripts/scenarios.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const page = slug => `${root}/public/guides/${slug}/index.html`;
const sitemap = readFileSync(`${root}/public/sitemap.xml`, 'utf8');
const llms = readFileSync(`${root}/public/llms.txt`, 'utf8');
const llmsFull = readFileSync(`${root}/public/llms-full.txt`, 'utf8');

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
    const html = readFileSync(page(s.slug), 'utf8');
    assert.ok((html.match(/"@type": "Question"/g) || []).length >= 3, `${s.slug}: FAQ needs 3 questions`);
    assert.ok((html.match(/<li><a href="\/guides\//g) || []).length >= 3, `${s.slug}: needs 3 related guides`);
    assert.ok((html.match(/class="cta"/g) || []).length === 1, `${s.slug}: exactly one CTA`);
    assert.match(html, /<title>[^<]*20\d\d/, `${s.slug}: title year`);
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

// Depth sections: every chart row must match the trainer's own engine for the
// chart's two-card hand, from a full six-deck shoe, against each upcard.
test('every strategy chart row matches the coach engine', async () => {
  const { roundWith, UPCARDS, bestAction, clearCache } = await import('./blackjack-helpers.mjs');
  const LETTER = { stand: 'S', hit: 'H', double: 'D', split: 'P' };
  const charted = scenarios.filter(s => s.chart);
  assert.ok(charted.length >= 4);
  for (const s of charted) {
    assert.ok(s.slug.startsWith('blackjack-'), s.slug);
    const row = UPCARDS.map(up => { clearCache(); return LETTER[bestAction(roundWith(s.chart.hand, up)).action]; }).join('');
    assert.equal(s.chart.cells, row, `${s.slug}: chart row`);
  }
});

// EV rows and quiz answers are engine output too: every printed EV must round
// to the coach's value, and every quiz link must open a hand that exists.
test('chart EV rows and quiz answers match the coach engine', async () => {
  const { roundWith, UPCARDS, bestAction, clearCache } = await import('./blackjack-helpers.mjs');
  const { findDrill } = await import('../src/rpg/drills.js');
  const withEv = scenarios.filter(s => s.chart?.ev);
  assert.ok(withEv.length >= 2);
  for (const s of withEv) {
    for (const [action, values] of Object.entries(s.chart.ev)) {
      UPCARDS.forEach((up, i) => {
        clearCache();
        const ev = bestAction(roundWith(s.chart.hand, up)).alternatives.find(o => o.action === action).ev;
        assert.equal(Math.round(ev * 100) / 100 || 0, values[i], `${s.slug}: ${action} vs ${up} (${ev.toFixed(4)})`);
      });
    }
  }
  const quizzed = scenarios.filter(s => s.quiz);
  assert.ok(quizzed.length >= 2);
  for (const s of quizzed) {
    assert.ok(s.quiz.length >= 2 && s.quiz.length <= 3, `${s.slug}: 2-3 quiz questions`);
    for (const q of s.quiz) {
      const url = new URL(q.href, 'https://playpokergym.com');
      assert.equal(url.pathname, '/web/', `${s.slug}: quiz links the trainer`);
      const drill = url.searchParams.get('drill');
      if (drill) assert.ok(findDrill(drill), `${s.slug}: drill ${drill} exists`);
      else assert.equal(url.searchParams.get('practice'), 'blackjack', `${s.slug}: practice param`);
      if (q.hand) {
        clearCache();
        assert.equal(bestAction(roundWith(q.hand, q.up)).action, q.action, `${s.slug}: ${q.q}`);
      }
    }
  }
});
