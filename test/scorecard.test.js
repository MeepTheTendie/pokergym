import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LAUNCH_START, LAUNCH_END, TARGETS, dayRange, peoplePerDayQuery, totalsQuery,
  returningQuery, channelsQuery, hooksQuery, formatScorecard, windowFromArgs,
} from '../scripts/scorecard.mjs';
import { notTestClause } from '../scripts/stats.mjs';

test('scorecard: the window is every day of the launch, inclusive', () => {
  assert.equal(LAUNCH_START, '2026-10-16');
  assert.equal(LAUNCH_END, '2026-10-29');
  const days = dayRange(LAUNCH_START, LAUNCH_END);
  assert.equal(days.length, 14);
  assert.equal(days[0], '2026-10-16');
  assert.equal(days.at(-1), '2026-10-29');
  assert.deepEqual(dayRange('2026-10-16', '2026-10-16'), ['2026-10-16']);
});

test('scorecard: the window is anchored to the plan dates and rejects junk', () => {
  assert.deepEqual(windowFromArgs([]), { start: LAUNCH_START, end: LAUNCH_END });
  assert.deepEqual(windowFromArgs(['--since=2026-10-01', '--until=2026-10-08']), { start: '2026-10-01', end: '2026-10-08' });
  assert.throws(() => dayRange("2026-10-16'; DROP", LAUNCH_END), /YYYY-MM-DD/);
  assert.throws(() => peoplePerDayQuery('nonsense', LAUNCH_END), /YYYY-MM-DD/);
});

test('scorecard: queries count people, not page requests', () => {
  assert.match(peoplePerDayQuery(LAUNCH_START, LAUNCH_END), /count\(DISTINCT person_id\)/);
  assert.match(peoplePerDayQuery(LAUNCH_START, LAUNCH_END), /BETWEEN toDate\('2026-10-16'\) AND toDate\('2026-10-29'\)/);
  assert.match(totalsQuery(LAUNCH_START, LAUNCH_END), /finished_the_daily_drill/);
  assert.match(returningQuery(LAUNCH_START, LAUNCH_END), /HAVING count\(DISTINCT toDate\(timestamp\)\) > 1/);
  assert.match(channelsQuery(LAUNCH_START, LAUNCH_END), /properties\.ref/);
  assert.match(hooksQuery(LAUNCH_START, LAUNCH_END), /properties\.utm_content/);
});

test('scorecard: prints a row per day, filling zeroes, and the four targets', () => {
  const out = formatScorecard({
    start: LAUNCH_START, end: LAUNCH_END,
    days: dayRange(LAUNCH_START, LAUNCH_END),
    peopleByDay: { '2026-10-17': 4 },
    totals: { people: 12, finished_a_session: 3, finished_the_daily_drill: 1 },
    returning: 2,
    channels: [{ ref: 'youtube', people: 7 }],
    hooks: [{ hook: 'link_in_bio', people: 5 }],
  });
  assert.match(out, /14-DAY SCORECARD \(2026-10-16 to 2026-10-29, UTC days\)/);
  assert.match(out, /reconciled Chicago scorecard/);
  assert.match(out, /Real human site visits\s+300\+\s+12/);
  assert.match(out, /People who came back \(2nd day\)\s+20\+\s+2/);
  assert.match(out, /Unprompted requests for more\s+3\+\s+by hand/);
  assert.match(out, /Video views \(all platforms\)\s+5000\+\s+by hand/);
  assert.match(out, /finished a five-hand session: 3/);
  assert.match(out, /2026-10-16\s+0/);
  assert.match(out, /2026-10-17\s+4/);
  assert.match(out, /2026-10-29\s+0/);
  assert.match(out, /youtube\s+7/);
  assert.match(out, /link_in_bio\s+5/);
  assert.equal(TARGETS.visits, 300);
});

test('scorecard: this project\'s own probe traffic is excluded from every count', () => {
  const clause = notTestClause();
  assert.match(clause, /event NOT IN \('iso_probe'/);
  assert.match(clause, /'attribcheck', 'funnel-check'/);
  assert.match(clause, /distinct_id NOT IN \('01a14b73/);
  for (const query of [
    peoplePerDayQuery(LAUNCH_START, LAUNCH_END), totalsQuery(LAUNCH_START, LAUNCH_END),
    returningQuery(LAUNCH_START, LAUNCH_END), channelsQuery(LAUNCH_START, LAUNCH_END),
    hooksQuery(LAUNCH_START, LAUNCH_END),
  ]) assert.match(query, /event NOT IN \('iso_probe'/, 'test traffic must not inflate the launch numbers');
});

test('scorecard: says so when nothing is tagged or nobody visited', () => {
  const out = formatScorecard({ start: LAUNCH_START, end: LAUNCH_END, days: dayRange(LAUNCH_START, LAUNCH_END) });
  assert.match(out, /no tagged arrivals yet/);
  assert.match(out, /no tagged hooks yet/);
  assert.match(out, /not yet/);
});
