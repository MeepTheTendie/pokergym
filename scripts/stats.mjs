// npm run stats — what actually happened, from two sources:
//
//   1. Cloudflare visit counter (Analytics Engine): page-like requests to /,
//      /web/ and the guides. Bots, crawlers and link unfurls are included, so
//      it is an upper bound, not people. Needs CLOUDFLARE_API_TOKEN.
//
//   2. PostHog (first-party, proxied through playpokergym.com): real people,
//      the journey stages they reach and the events they fire. PostHog's bot
//      filter drops headless/automated clients, so these are the honest
//      numbers. Needs POSTHOG_PERSONAL_API_KEY (read scope is enough).
//
// The two sections are independent: a missing credential skips that section
// instead of failing the whole command. Secrets are never printed.
//
// One-time setup (see README "Visit stats"):
//   Cloudflare: dashboard → My Profile → API Tokens → Create Token → Custom,
//     permission Account · Account Analytics · Read, for this account only.
//     Store it (never in the repo):
//       secret-tool store --label='Cloudflare Analytics (pokergym stats)' service cloudflare-analytics account pokergym
//   PostHog: dashboard → Settings → Personal API keys → Create, with
//     read access to insights and query. Store it:
//       secret-tool store --label='PostHog (pokergym stats)' service posthog-personal-api-key account pokergym
//   Or export CLOUDFLARE_API_TOKEN / POSTHOG_PERSONAL_API_KEY for a single run.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const DATASET = 'pokergym_visits';
const POSTHOG_HOST = 'https://us.posthog.com';

export function buildQuery(days = 30) {
  return `SELECT toDate(timestamp) AS day, blob1 AS path, blob2 AS ref, SUM(_sample_interval) AS count
FROM ${DATASET}
WHERE timestamp > NOW() - INTERVAL '${Number(days)}' DAY
GROUP BY day, path, ref
ORDER BY day DESC, path, count DESC
FORMAT JSON`;
}

export function formatTable(rows) {
  const lines = ['Poker Gym visit counter — page-like requests, not people.',
    'Unfurl bots (X, Discord, …) and crawlers are included; dates are UTC.', ''];
  const head = ['date', 'path', 'ref', 'count'];
  const body = rows.map(r => [String(r.day), String(r.path), String(r.ref), String(Math.round(Number(r.count)))]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map(b => b[i].length)));
  const fmt = cells => cells.map((c, i) => (i === 3 ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join('  ');
  lines.push(fmt(head), widths.map(w => '-'.repeat(w)).join('  '), ...body.map(fmt));
  if (!body.length) lines.push('(no counted requests in the last 30 days)');
  return lines.join('\n');
}

export function projectId() {
  return Number(process.env.POSTHOG_PROJECT_ID ?? 670990);
}

// Unique people per day, the number the dashboard shows as DAU.
export function playersByDayQuery(days = 14) {
  return `SELECT toDate(timestamp) AS day, count(DISTINCT person_id) AS people
FROM events
WHERE timestamp > now() - INTERVAL ${Number(days)} DAY
GROUP BY day
ORDER BY day`;
}

// People who reached each step of the journey, all on one row.
export function stageReachQuery(days = 30) {
  return `SELECT
  count(DISTINCT if(event = '$pageview', person_id, NULL)) AS saw_a_page,
  count(DISTINCT if(event = '$pageview' AND properties.$pathname = '/web/', person_id, NULL)) AS opened_the_trainer,
  count(DISTINCT if(event = 'game_start', person_id, NULL)) AS started_a_session,
  count(DISTINCT if(event = 'session_complete', person_id, NULL)) AS finished_five_hands,
  count(DISTINCT if(event = 'daily_complete', person_id, NULL)) AS finished_the_daily_drill
FROM events
WHERE timestamp > now() - INTERVAL ${Number(days)} DAY`;
}

// Everything except the high-volume automatic events.
export function eventTotalsQuery(days = 30) {
  return `SELECT event, count() AS times, count(DISTINCT person_id) AS people
FROM events
WHERE timestamp > now() - INTERVAL ${Number(days)} DAY
  AND event NOT IN ('$pageview', '$pageview_meta', '$autocapture', '$pageleave', '$feature_flag_called', '$web_vitals', '$snapshot', '$rageclick', '$dead_click', '$copy_autocapture', '$set', '$identify', '$create_alias', '$groupidentify')
GROUP BY event
ORDER BY times DESC
LIMIT 25`;
}

function tableText(head, body, rightCols = []) {
  const widths = head.map((h, i) => Math.max(h.length, ...body.map(b => String(b[i]).length)));
  const fmt = cells => cells.map((c, i) => (rightCols.includes(i) ? String(c).padStart(widths[i]) : String(c).padEnd(widths[i]))).join('  ');
  const lines = [fmt(head), widths.map(w => '-'.repeat(w)).join('  '), ...body.map(fmt)];
  return lines.join('\n');
}

export function formatPlayers(rows) {
  const lines = ['REAL PEOPLE — unique people per day (bots, crawlers and link previews excluded).', ''];
  const body = rows.map(r => [String(r.day), Number(r.people)]);
  lines.push(tableText(['day', 'people'], body, [1]));
  if (!body.length) lines.push('(nobody yet)');
  return lines.join('\n');
}

export function formatStages(row = {}) {
  const n = v => Number(v ?? 0);
  const lines = ['THE JOURNEY — people who reached each stage (last 30 days).', ''];
  const body = [
    ['saw a page', n(row.saw_a_page)],
    ['opened the trainer', n(row.opened_the_trainer)],
    ['started a session', n(row.started_a_session)],
    ['finished five hands', n(row.finished_five_hands)],
    ['finished the daily drill', n(row.finished_the_daily_drill)],
  ];
  lines.push(tableText(['stage', 'people'], body, [1]));
  return lines.join('\n');
}

export function formatEvents(rows) {
  const lines = ['WHAT PEOPLE DO — every event except automatic ones (last 30 days).', ''];
  const body = rows.map(r => [String(r.event), Number(r.times), Number(r.people)]);
  lines.push(tableText(['event', 'times', 'people'], body, [1, 2]));
  if (!body.length) lines.push('(nothing yet)');
  return lines.join('\n');
}

function token() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN.trim();
  try {
    return execFileSync('secret-tool', ['lookup', 'service', 'cloudflare-analytics', 'account', 'pokergym'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function accountId() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
  for (const file of ['.wrangler/cache/wrangler-account.json', 'node_modules/.cache/wrangler/wrangler-account.json']) {
    try { const id = JSON.parse(readFileSync(path.join(root, file), 'utf8')).account?.id; if (id) return id; } catch {}
  }
  return '';
}

function posthogKey() {
  if (process.env.POSTHOG_PERSONAL_API_KEY) return process.env.POSTHOG_PERSONAL_API_KEY.trim();
  try {
    return execFileSync('secret-tool', ['lookup', 'service', 'posthog-personal-api-key', 'account', 'pokergym'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

async function hogql(key, query) {
  const res = await fetch(`${POSTHOG_HOST}/api/projects/${projectId()}/query/`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PostHog query returned ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text);
  return (json.results ?? []).map(row => Object.fromEntries(json.columns.map((c, i) => [c, row[i]])));
}

async function posthogReport(key) {
  const [days, stages, totals] = await Promise.all([
    hogql(key, playersByDayQuery(14)),
    hogql(key, stageReachQuery(30)),
    hogql(key, eventTotalsQuery(30)),
  ]);
  return [formatPlayers(days), formatStages(stages[0]), formatEvents(totals)].join('\n\n');
}

async function main() {
  const sections = [];

  const tok = token();
  const account = accountId();
  if (tok && account) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`, {
      method: 'POST', headers: { authorization: `Bearer ${tok}` }, body: buildQuery(30),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Analytics Engine SQL API returned ${res.status}: ${text.slice(0, 300)}`);
    sections.push(formatTable(JSON.parse(text).data ?? []));
  } else {
    sections.push('Cloudflare visit counter — skipped (no CLOUDFLARE_API_TOKEN, or no account id).');
  }

  const key = posthogKey();
  if (key) sections.push(await posthogReport(key));
  else sections.push('Real-player analytics — skipped (no POSTHOG_PERSONAL_API_KEY). See README "Visit stats".');

  console.log(sections.join('\n\n'));
  if (!key && !(tok && account)) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exit(1); });
}
