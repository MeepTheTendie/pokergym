// Reconciled Poker Gym analytics report — America/Chicago reporting days.
//
// PostHog is the only source. The project is set to UTC, so every boundary is
// converted explicitly from a Chicago calendar day to a UTC instant; the SQL
// groups by the Chicago day as well. Nothing here changes the project's
// timezone setting.
//
// Definitions (also in docs/analytics-events.md):
//   visitor              unique person with a valid $pageview
//   player               unique visitor with a valid game_start
//   five_hand_completer  unique person with session_complete (five finished hands)
//   daily_drill_completer unique person with daily_complete
//
// Every breakdown is built from one row per person, so the source table always
// reconciles to the visitor total. Historic sessions without run ids are
// reported separately instead of being guessed.
import { fileURLToPath } from 'node:url';
import { posthogKey, hogql, notTestClause, INTERNAL_COHORT_ID } from './stats.mjs';

export const CHICAGO_TZ = 'America/Chicago';
export const DAY_EXPR = `toDate(toTimeZone(timestamp, '${CHICAGO_TZ}'))`;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function assertDay(day, name = 'day') {
  if (!ISO_DAY.test(String(day))) throw new Error(`${name} must be YYYY-MM-DD, got ${JSON.stringify(day)}`);
  return String(day);
}

/** Chicago calendar day (YYYY-MM-DD) for an instant. */
export function chicagoDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CHICAGO_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = type => parts.find(p => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Add whole calendar days to a YYYY-MM-DD key. */
export function addDays(day, delta) {
  const [y, m, d] = assertDay(day).split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + delta));
  return next.toISOString().slice(0, 10);
}

export function dayRange(start, endInclusive) {
  const out = [];
  for (let day = assertDay(start); day <= assertDay(endInclusive); day = addDays(day, 1)) out.push(day);
  return out;
}

/** Minutes east of UTC for a Chicago wall-clock instant. */
export function chicagoOffsetMinutes(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CHICAGO_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const get = type => Number(parts.find(p => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - date.getTime()) / 60000);
}

/**
 * The UTC instant of 00:00 Chicago on a calendar day. Iterates because the
 * offset at the UTC guess can differ from the offset at local midnight around
 * a DST change (midnight itself is never skipped or repeated in Chicago).
 */
export function chicagoMidnightUtc(day) {
  const [y, m, d] = assertDay(day).split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  let ts = target;
  for (let i = 0; i < 3; i++) ts = target - chicagoOffsetMinutes(new Date(ts)) * 60000;
  return new Date(ts);
}

function sqlTimestamp(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/** UTC timestamp boundaries for [startDay, endDayExclusive) in Chicago. */
export function chicagoBounds(startDay, endDayExclusive) {
  const start = chicagoMidnightUtc(startDay);
  const end = chicagoMidnightUtc(endDayExclusive);
  if (!(start < end)) throw new Error(`empty Chicago range ${startDay}..${endDayExclusive}`);
  return { start, end };
}

export function rangeClause(startDay, endDayExclusive) {
  const { start, end } = chicagoBounds(startDay, endDayExclusive);
  return `timestamp >= toDateTime('${sqlTimestamp(start)}') AND timestamp < toDateTime('${sqlTimestamp(end)}')`;
}

/** A single Chicago day, optionally only up to `now` (today's partial view). */
export function dayClause(day, { endExclusive = addDays(day, 1), partial = false, now = new Date() } = {}) {
  const start = chicagoMidnightUtc(day);
  const head = `timestamp >= toDateTime('${sqlTimestamp(start)}')`;
  if (partial) return `${head} AND timestamp < toDateTime('${sqlTimestamp(now)}')`;
  const end = chicagoMidnightUtc(endExclusive);
  return `${head} AND timestamp < toDateTime('${sqlTimestamp(end)}')`;
}

const clean = `(${notTestClause()})`;

/* --------------------------------- queries -------------------------------- */

export function visitorsByDayQuery(startDay, endDayExclusive) {
  return `SELECT ${DAY_EXPR} AS day, count(DISTINCT person_id) AS visitors
FROM events
WHERE ${rangeClause(startDay, endDayExclusive)} AND event = '$pageview' AND ${clean}
GROUP BY day ORDER BY day`;
}

export function windowTotalsQuery(startDay, endDayExclusive, { partial = false, now = new Date() } = {}) {
  const range = partial ? dayClause(startDay, { partial: true, now }) : rangeClause(startDay, endDayExclusive);
  return `SELECT
  count() AS visitors,
  countIf(starts > 0) AS players,
  sum(starts) AS game_starts,
  countIf(completes > 0) AS five_hand_completers,
  sum(completes) AS five_hand_completions,
  countIf(daily_completes > 0) AS daily_completers,
  sum(daily_completes) AS daily_completions
FROM (
  SELECT person_id,
    countIf(event = '$pageview') AS pageviews,
    countIf(event = 'game_start') AS starts,
    countIf(event = 'session_complete') AS completes,
    countIf(event = 'daily_complete') AS daily_completes
  FROM events
  WHERE ${range} AND ${clean}
  GROUP BY person_id
  HAVING pageviews > 0
)`;
}

// One row per person, with a first-touch source that never double-counts.
export function sourcePersonQuery() {
  return `SELECT person_id,
  argMin(coalesce(
    nullIf(properties.first_ref, ''),
    nullIf(properties.ref, ''),
    nullIf(properties.first_utm_source, ''),
    nullIf(properties.utm_source, ''),
    if(properties.$referrer = '$direct', 'direct', 'unknown')
  ), timestamp) AS source,
  count(DISTINCT ${DAY_EXPR}) AS days
FROM events
WHERE ${clean}
GROUP BY person_id`;
}

// Window visitors (pageview people) plus their gameplay flags. Joins to the
// all-time first-touch source in JS so the denominator is the window's
// visitors, not all-time people.
export function personWindowQuery(startDay, endDayExclusive, { partial = false, now = new Date() } = {}) {
  const range = partial ? dayClause(startDay, { partial: true, now }) : rangeClause(startDay, endDayExclusive);
  return `SELECT person_id,
  countIf(event = '$pageview') AS pageviews,
  countIf(event = 'game_start') AS starts,
  countIf(event = 'session_complete') AS completes
FROM events
WHERE ${range} AND ${clean}
GROUP BY person_id
HAVING pageviews > 0`;
}

export function firstGameQuery() {
  return `SELECT person_id, argMin(properties.game, timestamp) AS first_game
FROM events
WHERE event = 'game_start' AND ${clean}
GROUP BY person_id`;
}

export function personDayQuery(startDay, endDayExclusive) {
  return `SELECT person_id, ${DAY_EXPR} AS day,
  countIf(event = '$pageview') AS pageviews,
  countIf(event = 'game_start') AS starts,
  countIf(event = 'session_complete') AS completions
FROM events
WHERE ${rangeClause(startDay, endDayExclusive)} AND ${clean}
GROUP BY person_id, day
ORDER BY day, person_id`;
}

export function funnelQuery(startDay, endDayExclusive) {
  return `SELECT game,
  count() AS sessions,
  countIf(completes > 0) AS completed,
  countIf(hands = 0 AND completes = 0) AS before_first,
  countIf(hands = 1 AND completes = 0) AS after_1,
  countIf(hands = 2 AND completes = 0) AS after_2,
  countIf(hands = 3 AND completes = 0) AS after_3,
  countIf(hands = 4 AND completes = 0) AS after_4,
  countIf(hands >= 5 AND completes = 0) AS five_without_complete
FROM (
  SELECT person_id, properties.run_id AS run_id,
    -- game_start is the authoritative game for a run; session_complete is the
    -- fallback for the first instrumented builds, which did not stamp
    -- run_kind on completions. A few runs lost game_start but kept
    -- hand-level events, so fall back to their game rather than a blank row.
    -- Using any() here let a null win and split one run into several rows.
    coalesce(
      maxIf(properties.game, event = 'game_start' OR event = 'session_complete'),
      max(properties.game)
    ) AS game,
    countIf(event = 'hand_complete') AS hands,
    countIf(event = 'session_complete') AS completes
  FROM events
  WHERE ${rangeClause(startDay, endDayExclusive)} AND ${clean}
    AND properties.run_id IS NOT NULL
    -- Old Daily runs can have hand events but no run_kind and no game_start.
    -- Their run ids start with daily-; keep them out of the session table.
    AND properties.run_id NOT LIKE 'daily-%'
    -- Older completions were emitted without run_kind, so accept a
    -- session_complete even when that field is missing. Daily runs have
    -- run_kind = 'daily' and never emit session_complete.
    AND (properties.run_kind = 'session'
      OR (properties.run_kind IS NULL AND event = 'session_complete'))
    AND (properties.mode IS NULL OR properties.mode != 'challenge')
    AND event IN ('game_start', 'hand_dealt', 'hand_complete', 'session_complete')
  GROUP BY person_id, run_id
)
GROUP BY game
ORDER BY sessions DESC`;
}

export function preInstrumentationQuery(startDay, endDayExclusive) {
  return `SELECT
  countIf(event = 'game_start') AS starts,
  countIf(event = 'session_complete') AS completions,
  count(DISTINCT if(event = 'game_start', person_id, NULL)) AS people
FROM events
WHERE ${rangeClause(startDay, endDayExclusive)} AND ${clean}
  AND event IN ('game_start', 'session_complete')
  AND (properties.mode IS NULL OR properties.mode != 'challenge')
  AND (properties.run_id IS NULL OR properties.run_id = '')`;
}

export function dailyDrillQuery(startDay, endDayExclusive) {
  return `SELECT ${DAY_EXPR} AS day,
  max(properties.number) AS number,
  count(DISTINCT if(event = 'start_daily', person_id, NULL)) AS starters,
  countIf(event = 'start_daily') AS starts,
  count(DISTINCT if(event = 'daily_complete', person_id, NULL)) AS completers,
  countIf(event = 'start_daily' AND properties.scored = false) AS replay_starts,
  countIf(event = 'start_daily' AND properties.resumed = true) AS resumed_starts,
  countIf(event = 'daily_complete') AS completions
FROM events
WHERE ${rangeClause(startDay, endDayExclusive)} AND ${clean}
  AND event IN ('start_daily', 'daily_complete')
GROUP BY day ORDER BY day`;
}

export function dailyRepeatQuery(startDay, endDayExclusive) {
  return `SELECT
  countIf(start_days > 1) AS repeat_starters,
  countIf(complete_days > 1) AS repeat_completers
FROM (
  SELECT person_id,
    count(DISTINCT if(event = 'start_daily', ${DAY_EXPR}, NULL)) AS start_days,
    count(DISTINCT if(event = 'daily_complete', ${DAY_EXPR}, NULL)) AS complete_days
  FROM events
  WHERE ${rangeClause(startDay, endDayExclusive)} AND ${clean}
    AND event IN ('start_daily', 'daily_complete')
  GROUP BY person_id
)`;
}

export function auditQuery(startDay, endDayExclusive, { partial = false, now = new Date() } = {}) {
  const range = partial ? dayClause(startDay, { partial: true, now }) : rangeClause(startDay, endDayExclusive);
  return `SELECT
  countIf(event = '$pageview') AS raw_pageviews,
  countIf(event = '$pageview' AND ${clean}) AS clean_pageviews,
  count(DISTINCT if(event = '$pageview', person_id, NULL)) AS raw_visitors,
  count(DISTINCT if(event = '$pageview' AND ${clean}, person_id, NULL)) AS clean_visitors,
  count(DISTINCT if(event = '$pageview' AND properties.$raw_user_agent LIKE '%Edge/12.246%', person_id, NULL)) AS automation_profiles,
  count(DISTINCT if(event = '$pageview' AND person_id IN COHORT ${INTERNAL_COHORT_ID}, person_id, NULL)) AS cohort_profiles,
  count(DISTINCT if(event = '$pageview' AND properties.ref IN ('attribcheck', 'funnel-check'), person_id, NULL)) AS probe_ref_profiles,
  count(DISTINCT if(event IN ('iso_probe', 'pg_probe_batch', 'pg_proxy_probe', 'pg_proxy_probe2',
    'attrib_probe', 'diag_manual_probe', 'diag_pipeline_check', 'manual_probe'), person_id, NULL)) AS probe_event_profiles
FROM events
WHERE ${range}`;
}

/* ------------------------------- aggregators ------------------------------ */

export const SOURCE_LABELS = Object.freeze({
  youtube: 'YouTube',
  yt: 'YouTube',
  instagram: 'Instagram',
  ig: 'Instagram',
  reels: 'Instagram',
  ig_reels: 'Instagram',
  facebook: 'Facebook',
  fb: 'Facebook',
  reddit: 'Reddit',
  tiktok: 'TikTok',
  x: 'X',
  twitter: 'X',
  direct: 'Direct',
  unknown: 'Unknown',
  other: 'Other',
});

export function sourceLabel(raw) {
  const key = String(raw ?? 'unknown').toLowerCase();
  return SOURCE_LABELS[key] ?? 'Other';
}

// One row per person in, one row per source out. Adds a total row so callers
// can assert reconciliation.
export function aggregateSources(people = [], daysByPerson = new Map()) {
  const rows = new Map();
  for (const person of people) {
    const label = sourceLabel(person.source);
    const row = rows.get(label) ?? {
      source: label, visitors: 0, started: 0, finished: 0, returned: 0,
    };
    row.visitors += 1;
    if (Number(person.starts) > 0) row.started += 1;
    if (Number(person.completes) > 0) row.finished += 1;
    const days = Number(person.days ?? daysByPerson.get(person.person_id) ?? 0);
    if (days > 1) row.returned += 1;
    rows.set(label, row);
  }
  const order = ['YouTube', 'Instagram', 'Facebook', 'Reddit', 'TikTok', 'X', 'Direct', 'Unknown', 'Other'];
  const out = order.filter(label => rows.has(label)).map(label => rows.get(label));
  const total = {
    source: 'TOTAL', visitors: out.reduce((n, r) => n + r.visitors, 0),
    started: out.reduce((n, r) => n + r.started, 0),
    finished: out.reduce((n, r) => n + r.finished, 0),
    returned: out.reduce((n, r) => n + r.returned, 0),
  };
  return { rows: out, total };
}

/**
 * Cohort retention from person-day rows. Only cohorts with a *completed* next
 * day are eligible for D1; only cohorts with a completed day+7 are eligible
 * for the seven-day rate. `matureBefore` is the last completed day.
 */
export function computeRetention(personDays = [], { matureBefore, sourceByPerson = new Map(), firstGameByPerson = new Map() } = {}) {
  const people = new Map();
  for (const row of personDays) {
    const id = row.person_id;
    if (!id) continue;
    // Retention is a visitor metric: a day with no valid pageview is not a
    // visit, even if a late event arrived for it.
    if (Number(row.pageviews ?? 0) <= 0) continue;
    const entry = people.get(id) ?? { days: new Set(), gameDays: new Set() };
    entry.days.add(String(row.day));
    if (Number(row.starts) > 0) entry.gameDays.add(String(row.day));
    people.set(id, entry);
  }
  const empty = () => ({ people: 0, d1_eligible: 0, d1: 0, d7_eligible: 0, d7: 0, returned_site: 0, returned_game: 0 });
  const cohorts = new Map();
  const bySource = new Map();
  const byGame = new Map();

  for (const [id, entry] of people) {
    const days = [...entry.days].sort();
    const cohort = days[0];
    const next = addDays(cohort, 1);
    const seventh = addDays(cohort, 7);
    const d1Eligible = Boolean(matureBefore) && next <= matureBefore;
    const d7Eligible = Boolean(matureBefore) && seventh <= matureBefore;
    const d1 = d1Eligible && entry.days.has(next);
    const d7 = d7Eligible && days.some(day => day > cohort && day <= seventh);
    const returnedSite = days.length > 1;
    const returnedGame = [...entry.gameDays].some(day => day !== cohort);

    const bump = (map, key) => {
      const row = map.get(key) ?? empty();
      row.people += 1;
      if (d1Eligible) { row.d1_eligible += 1; if (d1) row.d1 += 1; }
      if (d7Eligible) { row.d7_eligible += 1; if (d7) row.d7 += 1; }
      if (returnedSite) row.returned_site += 1;
      if (returnedGame) row.returned_game += 1;
      map.set(key, row);
    };
    bump(cohorts, cohort);
    bump(bySource, sourceLabel(sourceByPerson.get(id) ?? 'unknown'));
    bump(byGame, firstGameByPerson.get(id) ?? 'no game_start');
  }
  return {
    cohorts: [...cohorts].sort(([a], [b]) => a.localeCompare(b)).map(([cohort_day, row]) => ({ cohort_day, ...row })),
    bySource: [...bySource].sort(([a], [b]) => a.localeCompare(b)).map(([source, row]) => ({ source, ...row })),
    byGame: [...byGame].sort(([a], [b]) => a.localeCompare(b)).map(([game, row]) => ({ game, ...row })),
  };
}

export function pct(n, d) {
  return d ? (100 * Number(n)) / Number(d) : 0;
}

export function rates(totals = {}) {
  const visitors = Number(totals.visitors ?? 0);
  const players = Number(totals.players ?? 0);
  const completers = Number(totals.five_hand_completers ?? 0);
  return {
    visitors, players,
    gameStartRate: pct(players, visitors),
    fiveHandCompleters: completers,
    fiveHandCompletionRate: pct(completers, players),
    fiveHandCompletions: Number(totals.five_hand_completions ?? 0),
    dailyCompleters: Number(totals.daily_completers ?? 0),
    dailyCompletions: Number(totals.daily_completions ?? 0),
  };
}

/** People active on 2+ distinct days inside [startDay, endDayInclusive]. */
export function returnRate(personDays = [], startDay, endDayInclusive) {
  const people = new Map();
  for (const row of personDays) {
    const day = String(row.day);
    if (day < startDay || day > endDayInclusive) continue;
    const entry = people.get(row.person_id) ?? { days: new Set(), pageviews: 0 };
    entry.days.add(day);
    entry.pageviews += Number(row.pageviews ?? 0);
    people.set(row.person_id, entry);
  }
  const visitors = [...people.values()].filter(p => p.pageviews > 0);
  const returned = visitors.filter(p => p.days.size > 1).length;
  return { visitors: visitors.length, returned, rate: pct(returned, visitors.length) };
}

export function dataWarnings({ sourceTotal, visitors, totals, dailyRows = [], funnelRows = [] }) {
  const warnings = [];
  if (sourceTotal !== visitors) {
    warnings.push(`source rows total ${sourceTotal} visitors but the window has ${visitors}; attribution does not reconcile`);
  }
  if (Number(totals?.five_hand_completers ?? 0) > Number(totals?.players ?? 0)) {
    warnings.push('five-hand completers exceed players; completion events are missing their game_start');
  }
  for (const row of dailyRows) {
    if (Number(row.completers) > Number(row.starters)) {
      warnings.push(`${row.day}: Daily Drill completers exceed starters`);
    }
    if (Number(row.completions) > Number(row.starts ?? row.starters)) {
      warnings.push(`${row.day}: ${row.completions} Daily Drill completions from ${row.starts ?? row.starters} start events; duplicate or missing events`);
    }
  }
  const funnelCompleted = funnelRows.reduce((n, r) => n + Number(r.completed ?? 0), 0);
  if (funnelCompleted > Number(totals?.five_hand_completions ?? 0)) {
    warnings.push('instrumented completed runs exceed session_complete events');
  }
  return warnings;
}

/* -------------------------------- formatting ------------------------------ */

function table(head, rows, right = []) {
  const widths = head.map((h, i) => Math.max(String(h).length, ...rows.map(r => String(r[i] ?? '').length)));
  const fmt = cells => cells.map((c, i) => right.includes(i) ? String(c ?? '').padStart(widths[i]) : String(c ?? '').padEnd(widths[i])).join('  ');
  return [fmt(head), widths.map(w => '-'.repeat(w)).join('  '), ...rows.map(fmt)].join('\n');
}

function metricLine(label, window, returnInfo = null) {
  const r = rates(window.totals);
  const returned = returnInfo
    ? ` · ${returnInfo.returned}/${returnInfo.visitors} returned (${returnInfo.rate.toFixed(0)}%)`
    : '';
  return `${label}: ${r.visitors} visitors · ${r.players} players (${r.gameStartRate.toFixed(1)}%) · ${r.fiveHandCompleters} five-hand completers (${r.fiveHandCompletionRate.toFixed(1)}% of players, ${r.fiveHandCompletions} completions)${returned} · ${r.dailyCompleters} Daily Drill completers (${r.dailyCompletions} completions)`;
}

export function formatSources(rows) {
  return table(
    ['Source', 'Visitors', 'Started hand', 'Finished 5 hands', 'Returned another day'],
    rows.map(r => [r.source, r.visitors, r.started, r.finished, r.returned]),
    [1, 2, 3, 4],
  );
}

export function formatFunnel(rows) {
  return table(
    ['Game', 'Runs', 'Before hand 1', 'After 1', 'After 2', 'After 3', 'After 4', 'Completed'],
    rows.map(r => [r.game, r.sessions, r.before_first, r.after_1, r.after_2, r.after_3, r.after_4, r.completed]),
    [1, 2, 3, 4, 5, 6, 7],
  );
}

export function formatDaily(rows) {
  return table(
    ['Day', 'Drill', 'Starters', 'Start events', 'Completers', 'Completion %', 'Replay starts', 'Resumed starts', 'Completions'],
    rows.map(r => [r.day, r.number ?? '—', r.starters, r.starts, r.completers, `${pct(r.completers, r.starters).toFixed(0)}%`, r.replay_starts, r.resumed_starts, r.completions]),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
}

export function formatRetention(retention) {
  return table(
    ['Cohort', 'People', 'D1 eligible', 'D1', 'D1 %', '7-day eligible', '7-day return', 'Returned (site)', 'Returned (game)'],
    retention.cohorts.map(r => [r.cohort_day, r.people, r.d1_eligible, r.d1, `${pct(r.d1, r.d1_eligible).toFixed(0)}%`, r.d7_eligible, r.d7, r.returned_site, r.returned_game]),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
}

export function formatRetentionGroup(rows, keyLabel, keyField) {
  return table(
    [keyLabel, 'People', 'D1 eligible', 'D1', 'D1 %', '7-day eligible', '7-day return', 'Returned (site)', 'Returned (game)'],
    rows.map(r => [r[keyField], r.people, r.d1_eligible, r.d1, `${pct(r.d1, r.d1_eligible).toFixed(0)}%`, r.d7_eligible, r.d7, r.returned_site, r.returned_game]),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
}

export function formatReport(data) {
  const {
    now, today, yesterday, yesterdayWindow, todayWindow, last7, prev7,
    sources, sourcesToday, funnel, preInstrumentation, daily, dailyRepeat, retention, audit, auditToday, warnings,
    return7, returnPrev7,
  } = data;
  const lines = [];
  const stamp = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: CHICAGO_TZ, timeZoneName: 'short',
  }).format(now);
  lines.push(`Poker Gym analytics — ${CHICAGO_TZ} reporting days`);
  lines.push(`Generated ${stamp}`);
  lines.push('');
  lines.push('DEFINITIONS — visitor = unique person with a valid $pageview; player = visitor with a game_start;');
  lines.push('five-hand completer = person with session_complete (five finished hands); Daily completer = person with daily_complete.');
  lines.push('Remaining visitors have passed the exclusion rules; they are not verified humans.');
  lines.push('');
  lines.push('YESTERDAY — last fully completed Chicago day');
  lines.push(metricLine(`  ${yesterday}`, yesterdayWindow));
  lines.push('TODAY — partial through the generation time');
  lines.push(metricLine(`  ${today}`, todayWindow));
  lines.push('');
  lines.push('LAST 7 COMPLETED DAYS vs PRECEDING 7');
  lines.push(metricLine(`  ${last7.start}..${last7.end}`, last7, return7));
  lines.push(metricLine(`  ${prev7.start}..${prev7.end}`, prev7, returnPrev7));
  lines.push('');
  lines.push('TODAY’S FIRST-TOUCH SOURCE (partial; denominator = today’s visitors)');
  lines.push(formatSources(sourcesToday.rows));
  lines.push(`  reconciled total: ${sourcesToday.total.visitors} visitors (today’s denominator ${sourcesToday.denominator})`);
  lines.push('');
  lines.push('SOURCE → GAMEPLAY (first-touch, last 14 completed days; today excluded)');
  lines.push(formatSources(sources.rows));
  lines.push(`  reconciled total: ${sources.total.visitors} visitors (window denominator ${sources.denominator})`);
  const ranked = sources.rows.filter(r => Number(r.visitors) > 0 && r.source !== 'Other' && r.source !== 'Unknown')
    .sort((a, b) => Number(b.finished) - Number(a.finished) || Number(b.started) - Number(a.started) || Number(b.visitors) - Number(a.visitors));
  if (ranked.length) {
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    lines.push(`  most completed gameplay among named sources: ${best.source} (${best.finished} five-hand completers, ${best.started} started); least: ${worst.source} (${worst.finished} completers, ${worst.started} started)`);
  }
  lines.push('');
  lines.push('WHERE SESSIONS END (instrumented runs from hand-level events)');
  lines.push(funnel.length ? formatFunnel(funnel) : '  no instrumented runs yet');
  lines.push(`  unattributed (no run_id): ${preInstrumentation.starts} starts, ${preInstrumentation.completions} completions — pre-instrumentation or an old cached bundle; hand-level depth cannot be reconstructed`);
  lines.push('');
  lines.push('DAILY DRILL — last 14 completed days (today is in the partial line above)');
  lines.push(daily.length ? formatDaily(daily) : '  no starts in this window');
  lines.push(`  people who started a drill on 2+ Chicago days: ${dailyRepeat.repeat_starters}; completed on 2+ days: ${dailyRepeat.repeat_completers}`);
  lines.push('');
  lines.push('RETENTION BY FIRST-TOUCH COHORT — last 30 days (only mature cohorts can show a rate)');
  lines.push(retention.cohorts.length ? formatRetention(retention) : '  no cohorts in this window');
  lines.push('');
  lines.push('RETENTION BY FIRST-TOUCH SOURCE');
  lines.push(retention.bySource.length ? formatRetentionGroup(retention.bySource, 'Source', 'source') : '  no cohorts in this window');
  lines.push('');
  lines.push('RETENTION BY INITIAL GAME (game of the first game_start)');
  lines.push(retention.byGame.length ? formatRetentionGroup(retention.byGame, 'Game', 'game') : '  no cohorts in this window');
  lines.push('');
  lines.push('AUDIT — excluded traffic');
  lines.push(`  last 14 completed days: raw pageviews ${audit.raw_pageviews ?? '—'} · clean ${audit.clean_pageviews ?? '—'} · excluded ${(audit.raw_pageviews ?? 0) - (audit.clean_pageviews ?? 0)} events`);
  lines.push(`  last 14 completed days: raw pageview people ${audit.raw_visitors} · clean ${audit.clean_visitors} · excluded ${audit.raw_visitors - audit.clean_visitors}`);
  lines.push(`  today (partial): raw pageview people ${auditToday.raw_visitors} · clean ${auditToday.clean_visitors} · excluded ${auditToday.raw_visitors - auditToday.clean_visitors}`);
  lines.push(`  matched by rule (may overlap): automation UA ${audit.automation_profiles} · internal/test cohort ${audit.cohort_profiles} · probe ref ${audit.probe_ref_profiles ?? 0} · probe event ${audit.probe_event_profiles ?? 0}`);
  lines.push('');
  lines.push('DATA QUALITY');
  lines.push(warnings.length ? warnings.map(w => `  ! ${w}`).join('\n') : '  OK — every source row reconciles to the visitor denominator');
  return lines.join('\n');
}

/* ---------------------------------- main ---------------------------------- */

export function windows(now = new Date()) {
  const today = chicagoDayKey(now);
  const yesterday = addDays(today, -1);
  return {
    today, yesterday,
    yesterdayWindow: { start: yesterday, end: today },
    last7: { start: addDays(yesterday, -6), end: yesterday },
    prev7: { start: addDays(yesterday, -13), end: addDays(yesterday, -7) },
    analysis: { start: addDays(today, -14), end: today },
    retention: { start: addDays(today, -30), end: addDays(today, 1), matureBefore: yesterday },
    todayPartialEnd: addDays(today, 1),
  };
}

async function main() {
  const key = posthogKey();
  if (!key) {
    console.error('No POSTHOG_PERSONAL_API_KEY (or keyring entry). See README "Visit stats".');
    process.exitCode = 1;
    return;
  }
  const now = new Date();
  const w = windows(now);
  const q = sql => hogql(key, sql);

  const [yesterdayTotals, todayTotals, last7Totals, prev7Totals] = await Promise.all([
    q(windowTotalsQuery(w.yesterdayWindow.start, w.yesterdayWindow.end)),
    q(windowTotalsQuery(w.today, w.todayPartialEnd, { partial: true, now })),
    q(windowTotalsQuery(w.last7.start, addDays(w.last7.end, 1))),
    q(windowTotalsQuery(w.prev7.start, addDays(w.prev7.end, 1))),
  ]);
  const [sourcePeopleAll, windowPeople, todayPeople, firstGames, personDays, funnel, preInstrumentation, daily, dailyRepeatRows, audit, auditToday, analysisTotals] = await Promise.all([
    q(sourcePersonQuery()),
    q(personWindowQuery(w.analysis.start, w.analysis.end)),
    q(personWindowQuery(w.today, w.todayPartialEnd, { partial: true, now })),
    q(firstGameQuery()),
    q(personDayQuery(w.retention.start, w.retention.end)),
    q(funnelQuery(w.analysis.start, w.analysis.end)),
    q(preInstrumentationQuery(w.analysis.start, w.analysis.end)),
    q(dailyDrillQuery(w.analysis.start, w.analysis.end)),
    q(dailyRepeatQuery(w.analysis.start, w.analysis.end)),
    q(auditQuery(w.analysis.start, w.analysis.end)),
    q(auditQuery(w.today, w.todayPartialEnd, { partial: true, now })),
    q(windowTotalsQuery(w.analysis.start, w.analysis.end)),
  ]);

  const daysByPerson = new Map();
  for (const row of personDays) daysByPerson.set(row.person_id, (daysByPerson.get(row.person_id) ?? 0) + 1);
  const allTimeSource = new Map(sourcePeopleAll.map(r => [r.person_id, r.source]));
  const allTimeDays = new Map(sourcePeopleAll.map(r => [r.person_id, Number(r.days ?? 0)]));
  const withSource = person => ({
    ...person,
    source: allTimeSource.get(person.person_id) ?? 'unknown',
    days: allTimeDays.get(person.person_id) ?? 0,
  });
  const sourceRows = windowPeople.map(withSource);
  const todaySourceRows = todayPeople.map(withSource);
  const sourceByPerson = allTimeSource;
  const firstGameByPerson = new Map(firstGames.map(r => [r.person_id, r.first_game]));
  const sources = aggregateSources(sourceRows, daysByPerson);
  const sourcesToday = aggregateSources(todaySourceRows, daysByPerson);
  const analysis = analysisTotals[0] ?? {};
  const retention = computeRetention(personDays, {
    matureBefore: w.retention.matureBefore, sourceByPerson, firstGameByPerson,
  });
  const return7 = returnRate(personDays, w.last7.start, w.last7.end);
  const returnPrev7 = returnRate(personDays, w.prev7.start, w.prev7.end);
  const totals = yesterdayTotals[0] ?? {};
  const data = {
    now, ...w,
    yesterdayWindow: { day: w.yesterday, totals },
    todayWindow: { day: w.today, totals: todayTotals[0] ?? {}, partial: true },
    last7: { ...w.last7, totals: last7Totals[0] ?? {} },
    prev7: { ...w.prev7, totals: prev7Totals[0] ?? {} },
    sources: { rows: sources.rows, total: sources.total, denominator: Number(analysis.visitors ?? 0) },
    sourcesToday: { rows: sourcesToday.rows, total: sourcesToday.total, denominator: Number(todayTotals[0]?.visitors ?? 0) },
    return7, returnPrev7,
    funnel,
    preInstrumentation: preInstrumentation[0] ?? { starts: 0, completions: 0, people: 0 },
    daily,
    dailyRepeat: dailyRepeatRows[0] ?? { repeat_starters: 0, repeat_completers: 0 },
    retention,
    audit: audit[0] ?? { raw_visitors: 0, clean_visitors: 0, automation_profiles: 0, cohort_profiles: 0 },
    auditToday: auditToday[0] ?? { raw_visitors: 0, clean_visitors: 0, automation_profiles: 0, cohort_profiles: 0 },
  };
  data.warnings = dataWarnings({
    sourceTotal: sources.total.visitors,
    visitors: Number(analysis.visitors ?? 0),
    totals: analysis,
    dailyRows: daily,
    funnelRows: funnel,
  });
  if (sourcesToday.total.visitors !== Number(todayTotals[0]?.visitors ?? 0)) {
    data.warnings.push(`today: source rows total ${sourcesToday.total.visitors} visitors but the day has ${todayTotals[0]?.visitors ?? 0}`);
  }
  console.log(formatReport(data));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exit(1); });
}
