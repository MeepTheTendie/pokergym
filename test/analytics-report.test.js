import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHICAGO_TZ, DAY_EXPR, DECISION_THRESHOLDS, addDays, chicagoDayKey, chicagoMidnightUtc,
  chicagoOffsetMinutes, rangeClause, dayClause, windowTotalsQuery, personWindowQuery,
  funnelQuery, dailyDrillQuery, sourcePersonQuery, auditQuery, firstGameQuery, personDayQuery,
  aggregateSources, sourceLabel, computeRetention, returnRate, rates, dataWarnings,
  decisionStatus, formatRetention, formatRetentionSummary, formatSources, sampleStatus,
  wilsonInterval, windows, REPORT_EPOCH,
} from '../scripts/analytics-report.mjs';

const iso = d => d.toISOString();

test('Chicago reporting day changes at Chicago midnight, not UTC midnight', () => {
  assert.equal(CHICAGO_TZ, 'America/Chicago');
  assert.equal(chicagoDayKey(new Date('2026-10-21T04:59:59Z')), '2026-10-20');
  assert.equal(chicagoDayKey(new Date('2026-10-21T05:00:00Z')), '2026-10-21');
  // 23:30 Chicago on Oct 21 is already Oct 22 UTC.
  assert.equal(chicagoDayKey(new Date('2026-10-22T04:30:00Z')), '2026-10-21');
});

test('Chicago midnight is converted explicitly across both DST changes', () => {
  // CDT (UTC-5) in October.
  assert.equal(iso(chicagoMidnightUtc('2026-10-21')), '2026-10-21T05:00:00.000Z');
  // CST (UTC-6) in January.
  assert.equal(iso(chicagoMidnightUtc('2026-01-15')), '2026-01-15T06:00:00.000Z');
  // DST starts 2026-03-08: midnight is still CST, the next midnight is CDT.
  assert.equal(iso(chicagoMidnightUtc('2026-03-08')), '2026-03-08T06:00:00.000Z');
  assert.equal(iso(chicagoMidnightUtc('2026-03-09')), '2026-03-09T05:00:00.000Z');
  // DST ends 2026-11-01: midnight is CDT, the next midnight is CST.
  assert.equal(iso(chicagoMidnightUtc('2026-11-01')), '2026-11-01T05:00:00.000Z');
  assert.equal(iso(chicagoMidnightUtc('2026-11-02')), '2026-11-02T06:00:00.000Z');
  assert.equal(chicagoOffsetMinutes(new Date('2026-07-01T12:00:00Z')), -300);
  assert.equal(chicagoOffsetMinutes(new Date('2026-12-01T12:00:00Z')), -360);
});

test('day arithmetic and ranges stay on calendar days', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-03-08', 1), '2026-03-09');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  const spring = rangeClause('2026-03-08', '2026-03-09');
  assert.match(spring, /2026-03-08 06:00:00/);
  assert.match(spring, /2026-03-09 05:00:00/);
  const fall = rangeClause('2026-11-01', '2026-11-02');
  assert.match(fall, /2026-11-01 05:00:00/);
  assert.match(fall, /2026-11-02 06:00:00/);
});

test('range clauses carry both the Chicago grouping and explicit UTC bounds', () => {
  const clause = rangeClause('2026-10-21', '2026-10-22');
  assert.match(clause, /timestamp >= toDateTime\('2026-10-21 05:00:00'\)/);
  assert.match(clause, /timestamp < toDateTime\('2026-10-22 05:00:00'\)/);
  assert.match(DAY_EXPR, /America\/Chicago/);
  const partial = dayClause('2026-10-21', { partial: true, now: new Date('2026-10-21T18:00:00Z') });
  assert.match(partial, /timestamp >= toDateTime\('2026-10-21 05:00:00'\)/);
  assert.match(partial, /timestamp < toDateTime\('2026-10-21 18:00:00'\)/);
});

test('queries apply the same exclusions everywhere', () => {
  const queries = [
    windowTotalsQuery('2026-10-14', '2026-10-21'),
    personWindowQuery('2026-10-14', '2026-10-21'),
    funnelQuery('2026-10-14', '2026-10-21'),
    dailyDrillQuery('2026-10-14', '2026-10-21'),
  ];
  for (const sql of queries) {
    assert.match(sql, /person_id NOT IN COHORT 644643/);
    assert.match(sql, /Edge\/12\.246/);
    assert.match(sql, /properties\.ref NOT IN/);
  }
});

test('totals are built from visitors, so players cannot exceed visitors', () => {
  const sql = windowTotalsQuery('2026-10-14', '2026-10-21');
  assert.match(sql, /HAVING pageviews > 0/);
  assert.match(sql, /countIf\(starts > 0\) AS players/);
  assert.match(sql, /countIf\(completes > 0\) AS five_hand_completers/);
  const source = sourcePersonQuery();
  assert.match(source, /first_utm_source/);
  assert.match(source, /properties\.utm_source/);
  assert.match(source, /count\(DISTINCT .*America\/Chicago.*\) AS days/);
  const partialAudit = auditQuery('2026-10-21', '2026-10-22', { partial: true, now: new Date('2026-10-21T18:00:00Z') });
  assert.match(partialAudit, /timestamp < toDateTime\('2026-10-21 18:00:00'\)/);
});

test('the funnel groups by run id and ignores challenge exams', () => {
  const sql = funnelQuery('2026-10-14', '2026-10-21');
  assert.match(sql, /properties\.run_id/);
  assert.match(sql, /properties\.run_kind = 'session'/);
  assert.match(sql, /properties\.run_id NOT LIKE 'daily-%'/, 'daily runs do not leak into the session funnel');
  assert.match(sql, /coalesce\(\s*maxIf\(properties\.game, event = 'game_start' OR event = 'session_complete'\)/);
  assert.match(sql, /max\(properties\.game\)/, 'hand events cover runs missing game_start');
  assert.match(sql, /properties\.run_kind IS NULL AND event = 'session_complete'/, 'older completions without run_kind still count');
  assert.match(sql, /GROUP BY person_id, run_id/);
  assert.match(sql, /properties\.mode != 'challenge'/);
  assert.match(sql, /hand_complete/);
});

test('daily queries expose replay and resume state', () => {
  const sql = dailyDrillQuery('2026-10-14', '2026-10-21');
  assert.match(sql, /properties\.scored = false/);
  assert.match(sql, /properties\.resumed = true/);
});

test('source rows are one bucket per person and reconcile to the total', () => {
  const people = [
    { person_id: 'a', source: 'youtube', starts: 1, completes: 0 },
    { person_id: 'b', source: 'youtube', starts: 0, completes: 0 },
    { person_id: 'c', source: 'reels', starts: 1, completes: 1 },
    { person_id: 'd', source: 'reddit', starts: 1, completes: 0 },
    { person_id: 'e', source: 'direct', starts: 0, completes: 0 },
    { person_id: 'f', source: 'something-else', starts: 0, completes: 0 },
  ];
  const days = new Map([['a', 2], ['c', 1]]);
  const { rows, total } = aggregateSources(people, days);
  assert.equal(total.visitors, people.length);
  assert.equal(rows.reduce((n, r) => n + r.visitors, 0), people.length);
  assert.equal(rows.find(r => r.source === 'YouTube').visitors, 2);
  assert.equal(rows.find(r => r.source === 'Instagram').visitors, 1);
  assert.equal(rows.find(r => r.source === 'Instagram').finished, 1);
  assert.equal(rows.find(r => r.source === 'YouTube').returned, 1);
  assert.equal(sourceLabel('reels'), 'Instagram');
  assert.equal(sourceLabel('ig'), 'Instagram');
  assert.equal(sourceLabel('fb'), 'Facebook');
  assert.equal(sourceLabel('twitter'), 'X');
  assert.equal(sourceLabel('yt'), 'YouTube');
  assert.equal(sourceLabel('unknown'), 'Unknown');
  assert.equal(sourceLabel(undefined), 'Unknown');
});

test('return rate counts repeat site days, not repeat pageviews', () => {
  const days = [
    { person_id: 'a', day: '2026-10-15', pageviews: 2 },
    { person_id: 'a', day: '2026-10-16', pageviews: 1 },
    { person_id: 'b', day: '2026-10-15', pageviews: 5 },
    { person_id: 'c', day: '2026-10-16', pageviews: 1 },
  ];
  const result = returnRate(days, '2026-10-15', '2026-10-16');
  assert.equal(result.visitors, 3);
  assert.equal(result.returned, 1);
  assert.equal(result.rate, 100 / 3);
});

test('retention only rates mature cohorts and separates site from gameplay', () => {
  const personDays = [
    { person_id: 'a', day: '2026-09-20', pageviews: 1, starts: 1 },
    { person_id: 'a', day: '2026-09-21', pageviews: 1, starts: 0 },
    { person_id: 'a', day: '2026-09-28', pageviews: 1, starts: 1 },
    { person_id: 'b', day: '2026-09-20', pageviews: 1, starts: 1 },
    { person_id: 'b', day: '2026-09-22', pageviews: 1, starts: 1 },
    { person_id: 'c', day: '2026-10-20', pageviews: 1, starts: 1 },
  ];
  const retention = computeRetention(personDays, { matureBefore: '2026-10-20' });
  const a = retention.cohorts.find(c => c.cohort_day === '2026-09-20');
  assert.equal(a.people, 2);
  assert.equal(a.d1_eligible, 2);
  assert.equal(a.d1, 1, 'a returned to the site the next day');
  assert.equal(a.d1_game, 0, 'a did not start a game the next day');
  assert.equal(a.d7_eligible, 2);
  assert.equal(a.d7, 2, 'both returned to the site within seven days');
  assert.equal(a.d7_game, 1, 'only b started a game within the seven-day window');
  assert.equal(a.returned_site, 2);
  assert.equal(a.returned_game, 2);
  assert.equal(retention.overall.d1, 1);
  assert.equal(retention.overall.d1_game, 0);
  assert.equal(retention.overall.d7, 2);
  assert.equal(retention.overall.d7_game, 1);
  const c = retention.cohorts.find(c => c.cohort_day === '2026-10-20');
  assert.equal(c.d1_eligible, 0, 'the next day has not finished');
  assert.equal(c.d7_eligible, 0);
});

test('a game-only return is not counted as a site return', () => {
  const personDays = [
    { person_id: 'a', day: '2026-09-20', pageviews: 1, starts: 1 },
    { person_id: 'a', day: '2026-09-21', pageviews: 0, starts: 1 },
  ];
  const retention = computeRetention(personDays, { matureBefore: '2026-09-21' });
  const a = retention.cohorts.find(c => c.cohort_day === '2026-09-20');
  assert.equal(a.d1, 0);
  assert.equal(a.d1_game, 1);
  assert.equal(a.returned_site, 0);
  assert.equal(a.returned_game, 1);
  assert.equal(a.returned_any, 1);
});

test('activity before the first pageview is not a return', () => {
  const personDays = [
    { person_id: 'a', day: '2026-09-19', pageviews: 0, starts: 1 },
    { person_id: 'a', day: '2026-09-20', pageviews: 1, starts: 0 },
  ];
  const retention = computeRetention(personDays, { matureBefore: '2026-09-21' });
  const a = retention.cohorts.find(c => c.cohort_day === '2026-09-20');
  assert.equal(a.returned_game, 0);
  assert.equal(a.returned_any, 0);
});

test('the window source query carries its own active-day count', () => {
  const sql = personWindowQuery('2026-10-14', '2026-10-21');
  assert.match(sql, /count\(DISTINCT .*America\/Chicago.*\) AS days/);
});

test('per-person queries do not truncate at PostHog\'s default row limit', () => {
  for (const sql of [
    sourcePersonQuery(),
    personWindowQuery('2026-10-14', '2026-10-21'),
    firstGameQuery(),
    personDayQuery('2026-10-14', '2026-10-21'),
  ]) {
    assert.match(sql, /LIMIT 100000/, 'raw per-person rows must not be cut off before aggregation');
  }
});

test('sample status refuses to over-read small denominators', () => {
  assert.equal(sampleStatus(0), 'too early');
  assert.equal(sampleStatus(DECISION_THRESHOLDS.minDirectional - 1), 'too early');
  assert.equal(sampleStatus(DECISION_THRESHOLDS.minDirectional), 'directional');
  assert.equal(sampleStatus(DECISION_THRESHOLDS.minDecision), 'decision-grade');
});

test('Wilson intervals stay inside zero and one hundred percent', () => {
  const zero = wilsonInterval(0, 11);
  assert.equal(zero.n, 11);
  assert.equal(zero.low, 0);
  assert.ok(zero.high > 20 && zero.high < 30);
  const half = wilsonInterval(5, 10);
  assert.ok(half.low > 20 && half.low < 30);
  assert.ok(half.high > 70 && half.high < 80);
  assert.deepEqual(wilsonInterval(0, 0), { low: 0, high: 0, n: 0 });
});

test('decision status names the weakest stage and refuses to decide on tiny samples', () => {
  assert.equal(decisionStatus({ visitors: 20, players: 2 }), 'too early');
  assert.equal(decisionStatus({
    visitors: 100, players: 20, fiveHandCompleters: 10,
    d1Eligible: 100, d1Game: 10, d7Eligible: 0, d7Game: 0,
  }), 'fix acquisition/onboarding');
  assert.equal(decisionStatus({
    visitors: 100, players: 50, fiveHandCompleters: 10,
    d1Eligible: 100, d1Game: 10,
  }), 'fix onboarding/game');
  assert.equal(decisionStatus({
    visitors: 100, players: 40, fiveHandCompleters: 20,
    d1Eligible: 100, d1Game: 2,
  }), 'fix retention');
  assert.equal(decisionStatus({
    visitors: 100, players: 40, fiveHandCompleters: 20,
    d1Eligible: 100, d1Game: 10,
  }), 'retention promising; keep collecting');
  assert.equal(decisionStatus({
    visitors: 120, players: 50, fiveHandCompleters: 25,
    d1Eligible: 120, d1Game: 12, d7Eligible: 100, d7Game: 10,
  }), 'retention cleared; demand gate remains');
});

test('retention output shows site and game separately', () => {
  const rows = [{
    cohort_day: '2026-09-20', people: 10, d1_eligible: 10, d1: 2, d1_game: 1,
    d7_eligible: 10, d7: 3, d7_game: 2, returned_site: 4, returned_game: 3,
  }];
  const text = formatRetention({ cohorts: rows });
  assert.match(text, /D1 site/);
  assert.match(text, /D1 game/);
  assert.match(text, /D7 game/);
  assert.match(text, /10%/);
});

test('retention summary states the denominator and confidence interval', () => {
  const text = formatRetentionSummary({ d1_eligible: 91, d1_game: 0, d7_eligible: 14, d7_game: 0 });
  assert.match(text, /D1 return-to-game: 0\/91/);
  assert.match(text, /95% CI/);
  assert.match(text, /D7 return-to-game: 0\/14/);
  assert.match(text, /too early/);
});

test('rates and warnings flag broken reconciliation', () => {
  const r = rates({ visitors: 10, players: 5, five_hand_completers: 2, five_hand_completions: 3, daily_completers: 1 });
  assert.equal(r.gameStartRate, 50);
  assert.equal(r.fiveHandCompletionRate, 40);
  const warnings = dataWarnings({
    sourceTotal: 9,
    visitors: 10,
    totals: { visitors: 10, players: 1, five_hand_completers: 2 },
    dailyRows: [{ day: '2026-10-20', starters: 1, completers: 2 }],
    funnelRows: [],
  });
  assert.ok(warnings.some(w => w.includes('source rows total 9')));
  assert.ok(warnings.some(w => w.includes('completers exceed players')));
  assert.ok(warnings.some(w => w.includes('Daily Drill completers exceed starters')));
  const duplicates = dataWarnings({
    sourceTotal: 1, visitors: 1, totals: { visitors: 1, players: 1, five_hand_completers: 0 },
    dailyRows: [{ day: '2026-10-17', starters: 1, starts: 1, completers: 1, completions: 3 }],
    funnelRows: [],
  });
  assert.ok(duplicates.some(w => w.includes('duplicate or missing events')));
});

test('source table prints a total row that matches the denominator', () => {
  const text = formatSources([
    { source: 'YouTube', visitors: 2, started: 1, finished: 1, returned: 0 },
    { source: 'Unknown', visitors: 1, started: 0, finished: 0, returned: 0 },
  ]);
  assert.match(text, /YouTube/);
  assert.match(text, /Unknown/);
});

test('the epoch audit starts at the reporting epoch, not a rolling window', () => {
  assert.equal(REPORT_EPOCH, '2026-10-21');
  const w = windows(new Date('2026-10-27T12:00:00Z'));
  assert.deepEqual(w.epoch, { start: '2026-10-21', end: '2026-10-27' });
});
