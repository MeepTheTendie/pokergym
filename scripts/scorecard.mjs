// npm run scorecard — HISTORICAL Oct 16-29 launch tracker.
//
// This is no longer a decision tool. It is kept so the original launch record
// can be reprinted. It uses UTC days, absolute counts, and an "any event"
// definition of a return; it does not match the Chicago-day report.
//
// The current decision surface is `npm run report` and the PostHog decision
// dashboard. The old 3-of-4 build rule is retired.
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
    `POKER GYM — HISTORICAL 14-DAY LAUNCH TRACKER (${start} to ${end}, UTC days)`,
    'HISTORICAL ONLY — NOT A DECISION TOOL. The 3-of-4 build rule is retired.',
    'Use `npm run report` and the PostHog decision dashboard for current definitions.',
    'This tracker counts any event on a UTC day; it is not the reconciled Chicago report.',
    '',
    'HISTORICAL TARGETS (kept for the archive; not a gate)',
    table(
      ['target', 'goal', 'now', 'status'],
      [
        ['Clean browser profiles (historical)', `${TARGETS.visits}+`, people, '—'],
        ['Active on 2+ UTC days (historical)', `${TARGETS.returning}+`, returning, '—'],
        ['Unprompted requests for more', `${TARGETS.requests}+`, 'by hand', '—'],
        ['Video views (all platforms)', `${TARGETS.views}+`, 'by hand', '—'],
      ],
      [1, 2, 3],
    ),
    '',
    'CONTEXT (not a decision metric)',
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
