import { test } from 'node:test';
import assert from 'node:assert/strict';

import { UNFURL_POST_HOUR_LOCAL, UNFURL_POST_TIMEZONE, UNFURL_POST_WINDOW_MINUTES, notTestClause } from '../scripts/stats.mjs';

test('stats: unfurl post window is evaluated in America/Chicago', () => {
  assert.equal(UNFURL_POST_HOUR_LOCAL, 16);
  assert.equal(UNFURL_POST_TIMEZONE, 'America/Chicago');
  assert.equal(UNFURL_POST_WINDOW_MINUTES, 5);
  const clause = notTestClause();
  assert.match(clause, /toHour\(toTimeZone\(first_ts, 'America\/Chicago'\)\) = 16/);
  assert.match(clause, /toHour\(toTimeZone\(timestamp, 'America\/Chicago'\)\) = 16/);
  assert.doesNotMatch(clause, /toHour\(first_ts\) = 21/);
  assert.doesNotMatch(clause, /toHour\(timestamp\) = 21/);
});

test('stats: unfurl DST examples before and after Nov 1 both fall in 16:00 America/Chicago window', () => {
  // Scheduled posts go out at 16:00 America/Chicago. Before the Nov 1 DST
  // change that is 21:00 UTC (CDT, UTC-5); after it is 22:00 UTC (CST, UTC-6).
  // The unfurl rule must catch both, so it compares in America/Chicago instead
  // of a fixed UTC hour.
  const beforeNov1 = new Date('2026-10-31T21:02:00Z');
  const afterNov1 = new Date('2026-11-02T22:02:00Z');
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = (d) => Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  for (const [label, d] of [['before Nov 1', beforeNov1], ['after Nov 1', afterNov1]]) {
    const { hour, minute } = parts(d);
    assert.equal(hour, '16', `${label} hour in America/Chicago`);
    assert.equal(minute, '02', `${label} minute in America/Chicago`);
    assert.ok(Number(minute) <= UNFURL_POST_WINDOW_MINUTES, `${label} in unfurl window`);
  }
  // Sanity: the two examples are different UTC hours, proving a fixed UTC
  // comparison would miss one of them.
  assert.equal(beforeNov1.getUTCHours(), 21);
  assert.equal(afterNov1.getUTCHours(), 22);
});
