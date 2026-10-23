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

// Traffic this project generated itself while testing (probe scripts, browser
// checks). No real player shares these markers, so excluding them keeps the
// launch numbers honest. A new probe must carry one of these markers, or a
// distinct_id listed below, so that it stays excluded.
const TEST_EVENT_NAMES = ['iso_probe', 'pg_probe_batch', 'pg_proxy_probe', 'pg_proxy_probe2',
  'attrib_probe', 'diag_manual_probe', 'diag_pipeline_check', 'manual_probe'];
const TEST_REFS = ['attribcheck', 'funnel-check'];
// Probe visits hit a bare URL with no marker, so no property can catch them.
const TEST_DISTINCT_IDS = ['01a14b73-6c7f-7169-99d2-5ce023d03e89',
  '01a14ba3-de9e-731c-ba49-9c24fe4b762e', '8b1034d9-00ab-5c69-af64-c57fc786eb6d'];

// Automated visits, not people: five separate browser profiles ran the same
// scripted path (landing page -> CTA -> trainer in under ten seconds) in two
// bursts, all with the same impossible user agent (Chrome 125 paired with
// Edge 12, a browser from 2015). Excluded by profile id and user agent so a
// repeat run with fresh ids is still caught.
const AUTOMATION_PERSON_IDS = ['ba45edef-65e8-507c-b152-87c8381300a2',
  'd7f0bd04-54f6-5299-ba90-f9702a921326', 'be9b3d85-2d61-55a9-b4d4-0fb8dac4b753',
  '5f2a6724-9a8f-5e93-9fe6-1a62dae1ee97', '5a42fe0e-c180-5c13-a659-3a2edd49adea'];
const AUTOMATION_USER_AGENTS = ['Edge/12.246'];

// PostHog's own "Internal / Test users" cohort. Profiles are marked
// $internal_or_test_user=true on the person and recalculated into this cohort.
export const INTERNAL_COHORT_ID = 644643;

// SQL fragment (HogQL) that drops this project's own probe traffic and the
// automation above.
// Unfurl bots: link-preview crawlers that survive PostHog's own bot filter.
// They arrive 0-5 minutes after a scheduled post (UNFURL_POST_HOUR_UTC), with a
// 1366x768 viewport, their first event is open_trainer, and they never interact.
// Reporting only: events are never dropped, only excluded from these counts.
export const UNFURL_POST_HOUR_UTC = 21;
export const UNFURL_POST_WINDOW_MINUTES = 5;

export function notTestClause() {
  const quoted = list => list.map(v => `'${v}'`).join(', ');
  const uaFilters = AUTOMATION_USER_AGENTS
    .map(ua => `properties.$raw_user_agent NOT LIKE '%${ua}%'`).join(' AND ');
  return `event NOT IN (${quoted(TEST_EVENT_NAMES)})
    AND distinct_id NOT IN (${quoted(TEST_DISTINCT_IDS)})
    AND person_id NOT IN (${quoted(AUTOMATION_PERSON_IDS)})
    AND person_id NOT IN COHORT ${INTERNAL_COHORT_ID}
    AND (properties.ref IS NULL OR properties.ref NOT IN (${quoted(TEST_REFS)}))
    AND (properties.first_ref IS NULL OR properties.first_ref NOT IN (${quoted(TEST_REFS)}))
    AND (properties.session_ref IS NULL OR properties.session_ref NOT IN (${quoted(TEST_REFS)}))
    AND (properties.$raw_user_agent IS NULL OR ${uaFilters})
    AND person_id NOT IN (
      SELECT person_id FROM (
        SELECT person_id, argMin(event, timestamp) AS first_event, min(timestamp) AS first_ts
        FROM events
        GROUP BY person_id
      ) WHERE first_event IN ('$pageview', 'open_trainer')
        AND toHour(first_ts) = ${UNFURL_POST_HOUR_UTC}
        AND toMinute(first_ts) <= ${UNFURL_POST_WINDOW_MINUTES}
        AND first_ts > toDateTime('2026-10-18')
        AND person_id IN (SELECT DISTINCT person_id FROM events WHERE event = 'open_trainer' AND properties.$screen_width = 1920 AND properties.$screen_height = 1080 AND toHour(timestamp) = ${UNFURL_POST_HOUR_UTC} AND toMinute(timestamp) <= ${UNFURL_POST_WINDOW_MINUTES})
        AND person_id NOT IN (SELECT DISTINCT person_id FROM events WHERE event IN ('game_start', 'start_training', 'decision_made', 'hand_complete', 'recap_tap', 'start_daily', 'daily_complete', 'share'))
    )`;
}

// Unique people per day, the number the dashboard shows as DAU. A pageview is
// the test for "was here": events like $set and $pageleave can arrive for a
// stale person from an earlier visit and would otherwise count as a player.
export function playersByDayQuery(days = 14) {
  return `SELECT toDate(timestamp) AS day, count(DISTINCT person_id) AS people
FROM events
WHERE timestamp > now() - INTERVAL ${Number(days)} DAY
  AND event = '$pageview'
  AND ${notTestClause()}
GROUP BY day
ORDER BY day`;
}

// People who reached each step of the journey, all on one row.
export function stageReachQuery(days = 30) {
  return `SELECT
  count(DISTINCT if(event = '$pageview', person_id, NULL)) AS saw_a_page,
  count(DISTINCT if(event = 'open_trainer', person_id, if(event = '$pageview' AND properties.$pathname = '/web/' AND timestamp < toDateTime('2026-10-18'), person_id, NULL))) AS opened_the_trainer,
  count(DISTINCT if(event = 'game_start', person_id, NULL)) AS started_a_session,
  count(DISTINCT if(event = 'session_complete', person_id, NULL)) AS finished_five_hands,
  count(DISTINCT if(event = 'daily_complete', person_id, NULL)) AS finished_the_daily_drill
FROM events
WHERE timestamp > now() - INTERVAL ${Number(days)} DAY
  AND ${notTestClause()}`;
}

// Everything except the high-volume automatic events.
export function eventTotalsQuery(days = 30) {
  return `SELECT event, count() AS times, count(DISTINCT person_id) AS people
FROM events
WHERE timestamp > now() - INTERVAL ${Number(days)} DAY
  AND event NOT IN ('$pageview', '$pageview_meta', '$autocapture', '$pageleave', '$feature_flag_called', '$web_vitals', '$snapshot', '$rageclick', '$dead_click', '$copy_autocapture', '$set', '$identify', '$create_alias', '$groupidentify')
  AND ${notTestClause()}
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

export { posthogKey };

export async function hogql(key, query) {
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
