// npm run scorecard — the Oct 16-29 launch scorecard, filled in from real
// analytics wherever a number can be measured automatically.
//
// It reports the site-side half of the plan's targets (unique people, people
// who came back on a second day, people per channel). Video views and
// unprompted requests for more cannot be measured here and are filled in by
// hand in SCORECARD.md.
//
// PostHog filters bots, so these are people, not requests. Do NOT use the
// Cloudflare visit counter for humans: it includes crawlers and link previews.
//
// Needs POSTHOG_PERSONAL_API_KEY (same setup as npm run stats; see README
// "Visit stats"). Override the window with:
//   npm run scorecard -- --since=2026-10-16 --until=2026-10-29
import { fileURLToPath } from 'node:url';
import { posthogKey, hogql, notTestClause } from './stats.mjs';

export const LAUNCH_START = '2026-10-16';
export const LAUNCH_END = '2026-10-29';

// The plan's day-14 targets. Only the site-side ones are measurable here.
export const TARGETS = Object.freeze({ visits: 300, returning: 20, requests: 3, views: 5000 });

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function assertDay(value, name) {
  if (!ISO_DAY.test(value)) throw new Error(`${name} must be YYYY-MM-DD, got ${JSON.stringify(value)}`);
  return value;
}

// Every day in the window, inclusive, so the table always has one row per day
// even when nobody visited.
export function dayRange(start, end) {
  assertDay(start, 'start');
  assertDay(end, 'end');
  const days = [];
  for (const d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function peoplePerDayQuery(start, end) {
  assertDay(start, 'start');
  assertDay(end, 'end');
  return `SELECT toDate(timestamp) AS day, count(DISTINCT person_id) AS people
FROM events
WHERE toDate(timestamp) BETWEEN toDate('${start}') AND toDate('${end}')
  AND ${notTestClause()}
GROUP BY day
ORDER BY day`;
}

export function totalsQuery(start, end) {
  assertDay(start, 'start');
  assertDay(end, 'end');
  return `SELECT
  count(DISTINCT person_id) AS people,
  count(DISTINCT if(event = 'session_complete', person_id, NULL)) AS finished_a_session,
  count(DISTINCT if(event = 'daily_complete', person_id, NULL)) AS finished_the_daily_drill
FROM events
WHERE toDate(timestamp) BETWEEN toDate('${start}') AND toDate('${end}')
  AND ${notTestClause()}`;
}

// People seen on two or more distinct days: the plan's "come back" number.
export function returningQuery(start, end) {
  assertDay(start, 'start');
  assertDay(end, 'end');
  return `SELECT count() AS people FROM (
  SELECT person_id
  FROM events
  WHERE toDate(timestamp) BETWEEN toDate('${start}') AND toDate('${end}')
    AND ${notTestClause()}
  GROUP BY person_id
  HAVING count(DISTINCT toDate(timestamp)) > 1
)`;
}

// Which hook (utm_content) brought people, so "make more of what works" can answer at
// the hook level, not just the platform level.
export function hooksQuery(start, end) {
  assertDay(start, 'start');
  assertDay(end, 'end');
  return `SELECT properties.utm_content AS hook, count(DISTINCT person_id) AS people
FROM events
WHERE toDate(timestamp) BETWEEN toDate('${start}') AND toDate('${end}')
  AND ${notTestClause()}
  AND properties.utm_content IS NOT NULL
GROUP BY hook
ORDER BY people DESC`;
}

// Which channel brought people, so "make more of what works" has an answer.
export function channelsQuery(start, end) {
  assertDay(start, 'start');
  assertDay(end, 'end');
  return `SELECT properties.ref AS ref, count(DISTINCT person_id) AS people
FROM events
WHERE toDate(timestamp) BETWEEN toDate('${start}') AND toDate('${end}')
  AND ${notTestClause()}
  AND properties.ref IS NOT NULL
GROUP BY ref
ORDER BY people DESC`;
}

function table(head, body, rightCols = []) {
  if (!body.length) return `${head.join('  ')}\n(no rows)`;
  const widths = head.map((h, i) => Math.max(h.length, ...body.map(b => String(b[i]).length)));
  const fmt = cells => cells.map((c, i) => (rightCols.includes(i) ? String(c).padStart(widths[i]) : String(c).padEnd(widths[i]))).join('  ');
  return [fmt(head), widths.map(w => '-'.repeat(w)).join('  '), ...body.map(fmt)].join('\n');
}

export function formatScorecard({ start, end, days, peopleByDay = {}, totals = {}, returning = 0, channels = [], hooks = [] }) {
  const n = v => Number(v ?? 0);
  const people = n(totals.people);
  const lines = [
    `POKER GYM — 14-DAY SCORECARD (${start} to ${end}, UTC days)`,
    'Site-side numbers only. Video views and unprompted requests are filled in by hand.',
    'This launch tracker uses PostHog UTC days and is not the reconciled Chicago scorecard (`npm run report`).',
    '',
    'TARGETS',
    table(
      ['target', 'goal', 'now', 'status'],
      [
        ['Real human site visits', `${TARGETS.visits}+`, people, people >= TARGETS.visits ? 'met' : 'not yet'],
        ['People who came back (2nd day)', `${TARGETS.returning}+`, returning, returning >= TARGETS.returning ? 'met' : 'not yet'],
        ['Unprompted requests for more', `${TARGETS.requests}+`, 'by hand', '—'],
        ['Video views (all platforms)', `${TARGETS.views}+`, 'by hand', '—'],
      ],
      [1, 2, 3],
    ),
    '',
    'CONTEXT',
    `finished a five-hand session: ${n(totals.finished_a_session)}   finished the daily drill: ${n(totals.finished_the_daily_drill)}`,
    '',
    'PEOPLE PER DAY',
    table(['date', 'people'], days.map(day => [day, n(peopleByDay[day])]), [1]),
    '',
    'PEOPLE PER CHANNEL (ref)',
    channels.length
      ? table(['ref', 'people'], channels.map(r => [String(r.ref), n(r.people)]), [1])
      : 'no tagged arrivals yet — check the tagging convention in MARKETING.md',
    '',
    'PEOPLE PER HOOK (utm_content)',
    hooks.length
      ? table(['hook', 'people'], hooks.map(r => [String(r.hook), n(r.people)]), [1])
      : 'no tagged hooks yet — add utm_content=<hook-id> to every link',
  ];
  return lines.join('\n');
}

export function windowFromArgs(argv = process.argv.slice(2)) {
  const value = flag => {
    const hit = argv.find(a => a.startsWith(`--${flag}=`));
    return hit ? hit.slice(flag.length + 3) : null;
  };
  return {
    start: value('since') ?? process.env.SCORECARD_SINCE ?? LAUNCH_START,
    end: value('until') ?? process.env.SCORECARD_UNTIL ?? LAUNCH_END,
  };
}

async function main() {
  const key = posthogKey();
  if (!key) {
    console.error('No POSTHOG_PERSONAL_API_KEY (or keyring entry). See README "Visit stats".');
    process.exitCode = 1;
    return;
  }
  const { start, end } = windowFromArgs();
  const [perDay, totals, returning, channels, hooks] = await Promise.all([
    hogql(key, peoplePerDayQuery(start, end)),
    hogql(key, totalsQuery(start, end)),
    hogql(key, returningQuery(start, end)),
    hogql(key, channelsQuery(start, end)),
    hogql(key, hooksQuery(start, end)),
  ]);
  const peopleByDay = Object.fromEntries(perDay.map(r => [String(r.day), r.people]));
  console.log(formatScorecard({
    start, end, days: dayRange(start, end), peopleByDay,
    totals: totals[0] ?? {}, returning: returning[0]?.people ?? 0, channels, hooks,
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exit(1); });
}
