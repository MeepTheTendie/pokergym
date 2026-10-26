import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PUBLISHED_REFS } from '../src/rpg/links.js';
import { GUIDE_PATHS, pathBucket, isPageLike, countBucket, dataPoint } from '../worker/count.js';
import worker from '../worker/index.js';
import { SECURITY_HEADERS, headersFileText } from '../worker/security.js';
import { buildQuery, formatTable, playersByDayQuery, stageReachQuery, eventTotalsQuery, formatPlayers, formatStages, formatEvents, notTestClause } from '../scripts/stats.mjs';

const nav = (url, extra = {}) => new Request(url, { headers: { 'sec-fetch-mode': 'navigate', ...extra } });

test('path buckets: published pages only, URL variants normalised', () => {
  assert.equal(pathBucket('/'), '/');
  for (const p of ['/web/', '/web', '/web/index.html']) assert.equal(pathBucket(p), '/web/');
  for (const p of ['/guides/unknown/', '/guides/weekly-01/style.css', '/web/privacy.html', '/sitemap.xml', '/og.png', '/robots.txt', '/web/app.js', '/src/rpg/links.js', '/sw.js', '/web/index.htm', '/WEB/']) assert.equal(pathBucket(p), null, p);
});

test('page-like predicate: navigations and HTML requests only', () => {
  assert.equal(isPageLike(new Headers({ 'sec-fetch-mode': 'navigate' })), true);
  assert.equal(isPageLike(new Headers({ 'sec-fetch-mode': 'cors', accept: 'text/html' })), false);
  assert.equal(isPageLike(new Headers({ 'sec-fetch-mode': 'no-cors' })), false);
  assert.equal(isPageLike(new Headers({ accept: 'text/html,application/xhtml+xml' })), true);
  assert.equal(isPageLike(new Headers({ accept: '*/*' })), false);
  assert.equal(isPageLike(new Headers()), false);
});

test('countBucket uses the shared PUBLISHED_REFS whitelist', () => {
  for (const ref of PUBLISHED_REFS) assert.deepEqual(countBucket(nav(`https://playpokergym.com/web/?ref=${ref}&d=3`)), { path: '/web/', ref });
  assert.deepEqual(countBucket(nav('https://playpokergym.com/')), { path: '/', ref: 'none' });
  assert.deepEqual(countBucket(nav('https://playpokergym.com/?ref=SHARE')), { path: '/', ref: 'other' });
  assert.deepEqual(countBucket(nav('https://playpokergym.com/web?ref=' + 'x'.repeat(500))), { path: '/web/', ref: 'other' });
  assert.deepEqual(countBucket(nav('https://playpokergym.com/guides/blackjack/?ref=hn')), { path: '/guides/blackjack/', ref: 'hn' });
  assert.equal(countBucket(new Request('https://playpokergym.com/web/', { method: 'POST', headers: { 'sec-fetch-mode': 'navigate' } })), null);
  assert.equal(countBucket(new Request('https://playpokergym.com/web/', { headers: { 'sec-fetch-mode': 'cors' } })), null);
});

test('data point carries only path and ref', () => {
  assert.deepEqual(dataPoint({ path: '/web/', ref: 'hn' }), { indexes: ['v1'], blobs: ['/web/', 'hn'], doubles: [1] });
});

function env({ throws = false, status = 200 } = {}) {
  const points = []; const served = [];
  return {
    points, served,
    VISITS: { writeDataPoint(p) { if (throws) throw new Error('AE down'); points.push(p); } },
    ASSETS: { fetch(req) { served.push(new URL(req.url).pathname); return new Response(status === 200 ? 'ok' : null, { status }); } },
  };
}
function ctx() { const waits = []; return { waits, waitUntil(p) { waits.push(p); } }; }

test('www homepage enters canonical save origin with attribution preserved', async () => {
  const e = env(); const c = ctx();
  const response = await worker.fetch(nav('https://www.playpokergym.com/?ref=youtube&daily=1'), e, c);
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://playpokergym.com/?ref=youtube&daily=1');
  assert.deepEqual(e.served, []);
  assert.deepEqual(e.points, []);
  assert.equal(c.waits.length, 0);
  for (const address of ['https://playpokergym.com/', 'https://playpokergym.com/web/']) {
    assert.equal((await worker.fetch(nav(address), e, c)).status, 200);
  }
  const wwwWeb = await worker.fetch(nav('https://www.playpokergym.com/web/'), e, c);
  assert.equal(wwwWeb.status, 301);
  assert.equal(wwwWeb.headers.get('location'), 'https://playpokergym.com/web/');
});

test('typed path /go redirects to the trainer with endscreen attribution', async () => {
  const e = env(); const c = ctx();
  const response = await worker.fetch(nav('https://playpokergym.com/go'), e, c);
  assert.equal(response.status, 302);
  const loc = new URL(response.headers.get('location'));
  assert.equal(loc.pathname, '/web/');
  assert.equal(loc.searchParams.get('ref'), 'endscreen');
  assert.equal(loc.searchParams.get('utm_content'), 'typed');
  assert.deepEqual(e.served, []);
  assert.deepEqual(e.points, []);
  assert.equal(c.waits.length, 0);
});

test('worker counts a page view and always serves assets', async () => {
  const e = env(); const c = ctx();
  const res = await worker.fetch(nav('https://playpokergym.com/web/?ref=share&d=9', { 'cf-connecting-ip': '203.0.113.9', 'user-agent': 'X', cookie: 'a=b' }), e, c);
  await Promise.all(c.waits);
  assert.equal(await res.text(), 'ok');
  assert.deepEqual(e.points, [{ indexes: ['v1'], blobs: ['/web/', 'share'], doubles: [1] }]);
  assert.ok(!JSON.stringify(e.points).includes('203.0.113.9'));
  assert.deepEqual(e.served, ['/web/']);
});

test('worker still serves when counting fails or is unbound', async () => {
  const e = env({ throws: true }); const c = ctx();
  const res = await worker.fetch(nav('https://playpokergym.com/'), e, c);
  await Promise.all(c.waits);
  assert.equal(await res.text(), 'ok');
  const unbound = env(); delete unbound.VISITS;
  assert.equal(await (await worker.fetch(nav('https://playpokergym.com/'), unbound, ctx())).text(), 'ok');
  const assetEnv = env(); const c2 = ctx();
  await worker.fetch(new Request('https://playpokergym.com/web/app.js'), assetEnv, c2);
  assert.equal(c2.waits.length, 0);
  // A redirect (/web -> /web/) is not counted; the follow-up /web/ is.
  const redirect = env({ status: 307 }); const c3 = ctx();
  const r = await worker.fetch(nav('https://playpokergym.com/web'), redirect, c3);
  assert.equal(r.status, 307);
  assert.equal(c3.waits.length, 0);
});

test('every served response carries the shared security headers', async () => {
  const e = env(); const c = ctx();
  const res = await worker.fetch(nav('https://playpokergym.com/web/'), e, c);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) assert.equal(res.headers.get(name), value, name);
  // Scripts may not run inline, so any future inline <script> must be hashed.
  assert.doesNotMatch(SECURITY_HEADERS['content-security-policy'], /script-src[^;]*'unsafe-inline'/);
  // Status (and body) survive the header rewrite, including 304s and redirects.
  assert.equal(await res.text(), 'ok');
  assert.equal((await worker.fetch(nav('https://playpokergym.com/web/'), env({ status: 304 }), ctx())).status, 304);
  assert.match(headersFileText(), /^\/\*[\s\S]*\n$/);
  assert.match(headersFileText(), /\n {2}content-security-policy: default-src 'self'; script-src 'self';/);
});

test('wrangler config: worker + assets binding, array run_worker_first, AE dataset, custom domain', async () => {
  const raw = await readFile('wrangler.jsonc', 'utf8');
  const cfg = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ''));
  assert.equal(cfg.main, 'worker/index.js');
  assert.equal(cfg.assets.binding, 'ASSETS');
  assert.ok(Array.isArray(cfg.assets.run_worker_first));
  assert.deepEqual(cfg.assets.run_worker_first, ['/', '/go', '/web/', '/web', '/web/index.html', '/guides/*', '/ingest/*']);
  for (const p of cfg.assets.run_worker_first.filter(p => !p.includes('*') && p !== '/go')) assert.ok(pathBucket(p), `${p} is a counted path`);
  assert.deepEqual(cfg.analytics_engine_datasets, [{ binding: 'VISITS', dataset: 'pokergym_visits' }]);
  assert.ok(cfg.routes.some(r => r.pattern === 'playpokergym.com' && r.custom_domain));
  assert.equal(cfg.workers_dev, false);
});

test('stats query and table label', () => {
  assert.match(buildQuery(30), /FROM pokergym_visits/);
  assert.match(buildQuery(30), /INTERVAL '30' DAY/);
  const table = formatTable([{ day: '2026-10-14', path: '/web/', ref: 'share', count: 3 }]);
  assert.match(table, /page-like requests, not people/);
  assert.match(table, /2026-10-14\s+\/web\/\s+share\s+3/);
  assert.match(formatTable([]), /no counted requests/);
});

test('stats: real-player report counts people, not requests', () => {
  assert.match(playersByDayQuery(14), /count\(DISTINCT person_id\)/);
  assert.match(playersByDayQuery(14), /INTERVAL 14 DAY/);
  assert.match(playersByDayQuery(14), /event = '\$pageview'/, 'only a pageview proves someone was here today');
  assert.match(stageReachQuery(30), /finished_the_daily_drill/);
  assert.match(stageReachQuery(30), /event = 'open_trainer'/);
  assert.match(eventTotalsQuery(30), /event NOT IN \(/);

  const stages = formatStages({ saw_a_page: 10, opened_the_trainer: 6, started_a_session: 5, finished_five_hands: 3, finished_the_daily_drill: 1 });
  assert.match(stages, /people who reached each stage/);
  assert.match(stages, /saw a page\s+10/);
  assert.match(stages, /finished the daily drill\s+1/);
  assert.match(formatStages({}), /saw a page\s+0/);

  const players = formatPlayers([{ day: '2026-10-17', people: 4 }]);
  assert.match(players, /REAL PEOPLE/);
  assert.match(players, /2026-10-17\s+4/);
  assert.match(formatPlayers([]), /nobody yet/);

  assert.match(formatEvents([{ event: 'game_start', times: 9, people: 3 }]), /game_start\s+9\s+3/);
  assert.match(formatEvents([]), /nothing yet/);
});

test('stats: probe and scripted automation visits are excluded', () => {
  const clause = notTestClause();
  assert.match(clause, /'diag_pipeline_check'/);
  assert.match(clause, /person_id NOT IN \('ba45edef-/);
  assert.match(clause, /properties\.\$raw_user_agent IS NULL OR/);
  assert.match(clause, /NOT LIKE '%Edge\/12\.246%'/);
});

test('stats: unfurl-bot visits are excluded', () => {
  const clause = notTestClause();
  assert.match(clause, /properties\.\$viewport_width = 1366/);
  assert.match(clause, /properties\.\$viewport_height = 768/);
  assert.match(clause, /properties\.\$screen_width = 1920/);
  assert.match(clause, /properties\.\$screen_height = 1080/);
  assert.match(clause, /toHour\(timestamp\) = 21/);
  assert.match(clause, /toMinute\(timestamp\) <= 5/);
  assert.match(clause, /open_trainer/);
  assert.match(clause, /game_start/);
  assert.match(clause, /\$pageview/);
});

test('stats: a 1920x1080 screen with a normal window size is kept', () => {
  const clause = notTestClause();
  // The exclusion requires BOTH the 1366x768 viewport and the 1920x1080 screen,
  // so a real player whose window is not 1366x768 survives the filter.
  assert.match(clause, /properties\.\$viewport_width = 1366/);
  assert.match(clause, /properties\.\$viewport_height = 768/);
  assert.match(clause, /properties\.\$screen_width = 1920/);
  assert.match(clause, /properties\.\$screen_height = 1080/);
});

test('stats: an unfurl bot whose $pageview lands before open_trainer is excluded', () => {
  const clause = notTestClause();
  // Condition 1 must allow $pageview as the first event, since 15 of 16
  // cluster members have $pageview a few ms before open_trainer.
  assert.match(clause, /event IN \('\$pageview', 'open_trainer'\)/);
  assert.match(clause, /argMin\(event, timestamp\)/);
  assert.match(clause, /IN \('\$pageview', 'open_trainer'\)/);
});

test('stats: a 1366x768 visitor at 21:01 who then fires game_start is kept', () => {
  const clause = notTestClause();
  // The exclusion subquery must require no later interaction events, so a
  // visitor who fires game_start survives the filter.
  assert.match(clause, /person_id NOT IN \(SELECT DISTINCT person_id FROM events WHERE event IN/);
  assert.match(clause, /'game_start'/);
});

test('stats: a normal visitor is kept', () => {
  const clause = notTestClause();
  // The clause is an exclusion list, so a normal visitor matches none of it.
  assert.doesNotMatch(clause, /person_id NOT IN \('normal/);
  assert.match(clause, /person_id NOT IN COHORT/);
});

test('stats: stageReachQuery handles dates before open_trainer existed', () => {
  assert.match(stageReachQuery(30), /event = 'open_trainer'/);
  assert.match(stageReachQuery(30), /properties\.\$pathname = '\/web\/'/);
});


test('guide campaign attribution excludes private queries, assets, cache fills and failed pages', async () => {
  for (const path of GUIDE_PATHS) {
    for (const variant of [path, path.slice(0, -1), `${path}index.html`]) {
      assert.equal(pathBucket(variant), path);
    }
  }
  const e = env(); const c = ctx();
  const url = 'https://playpokergym.com/guides/weekly-01/?ref=youtube&email=private@example.invalid';
  assert.equal((await worker.fetch(nav(url), e, c)).status, 200);
  await Promise.all(c.waits);
  assert.deepEqual(e.points, [{ indexes: ['v1'], blobs: ['/guides/weekly-01/', 'youtube'], doubles: [1] }]);
  for (const request of [
    new Request(url, { headers: { 'sec-fetch-mode': 'cors', accept: 'text/html' } }),
    new Request(url, { method: 'HEAD', headers: { accept: 'text/html' } }),
    nav('https://playpokergym.com/guides/weekly-01/style.css'),
    nav('https://playpokergym.com/guides/unknown/'),
  ]) assert.equal(countBucket(request), null);
  for (const status of [307, 404, 500]) {
    const failed = env({ status }); const failedCtx = ctx();
    assert.equal((await worker.fetch(nav(url), failed, failedCtx)).status, status);
    assert.deepEqual(failed.points, []);
    assert.equal(failedCtx.waits.length, 0);
  }
});
