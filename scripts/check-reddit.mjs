// Is Reddit actually a retention channel?
//
// The 2026-10-26 launch read showed 2 of 19 Reddit visitors returning the next
// day (10.5%) versus 3 of 61 direct (4.9%) and 0 everywhere else. Two people is
// not a rate, so this script reports Reddit cohort-by-cohort and marks each day
// only when its D1 and D7 windows have fully elapsed. Run it after 2026-10-28
// to settle the question.
//
//   npm run check:reddit
//
// Auth: POSTHOG_PERSONAL_API_KEY, or the secret-tool entry used by stats.mjs.

import { hogql, notTestClause, posthogKey } from './stats.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;
// Same reporting exclusions as npm run report, so the two tools cannot disagree.
const clean = `(${notTestClause()})`;

function chicagoDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDays(day, n) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

// First touch is the source on a person's first pageview, using the same
// precedence the loader uses: utm_source, then ref, then the referring domain.
const QUERY = `
WITH touch AS (
  SELECT person_id,
    toDate(toTimeZone(min(timestamp), 'America/Chicago')) AS cohort_day,
    argMin(
      coalesce(
        nullIf(properties.utm_source, ''),
        nullIf(properties.ref, ''),
        nullIf(properties.$referring_domain, ''),
        'direct'
      ),
      timestamp
    ) AS source
  FROM events
  WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY
    AND ${clean}
  GROUP BY person_id
),
activity AS (
  SELECT person_id,
    toDate(toTimeZone(timestamp, 'America/Chicago')) AS day,
    maxIf(1, event IN ('open_trainer', 'game_start')) AS played
  FROM events
  WHERE timestamp >= now() - INTERVAL 30 DAY
    AND ${clean}
  GROUP BY person_id, day
)
SELECT
  t.source AS source,
  toString(t.cohort_day) AS cohort_day,
  uniqExact(t.person_id) AS people,
  uniqExactIf(t.person_id, a.day = addDays(t.cohort_day, 1)) AS d1_returned,
  uniqExactIf(t.person_id, a.day = addDays(t.cohort_day, 1) AND a.played = 1) AS d1_played,
  uniqExactIf(t.person_id, a.day > t.cohort_day AND a.day <= addDays(t.cohort_day, 7)) AS d7_returned
FROM touch t
LEFT JOIN activity a ON a.person_id = t.person_id
GROUP BY t.source, t.cohort_day
ORDER BY t.source, t.cohort_day
`;

function pct(n, d) {
  return d ? `${((100 * n) / d).toFixed(1)}%` : '—';
}

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

async function main() {
  const key = posthogKey();
  if (!key) {
    console.error('No PostHog key. Set POSTHOG_PERSONAL_API_KEY or store one with:');
    console.error("  secret-tool store --label='PostHog (pokergym stats)' service posthog-personal-api-key account pokergym");
    process.exitCode = 1;
    return;
  }

  const today = chicagoDay();
  const rows = await hogql(key, QUERY);

  const bySource = new Map();
  for (const row of rows) {
    const entry = bySource.get(row.source) ?? { people: 0, d1: 0, d1Played: 0, d7: 0, d7People: 0 };
    const people = Number(row.people);
    const d1Mature = row.cohort_day < today;
    const d7Mature = row.cohort_day <= addDays(today, -7);
    entry.people += people;
    entry.d1 += Number(row.d1_returned);
    entry.d1Played += Number(row.d1_played);
    if (d1Mature) entry.d1People = (entry.d1People ?? 0) + people;
    if (d7Mature) {
      entry.d7People += people;
      entry.d7 += Number(row.d7_returned);
    }
    bySource.set(row.source, entry);
  }

  const ranked = [...bySource.entries()].sort((a, b) => b[1].people - a[1].people);
  console.log(`RETENTION BY FIRST TOUCH — cohorts through ${today} (America/Chicago)\n`);
  const header = `${pad('source', 18)}${pad('people', 8)}${pad('D1', 6)}${pad('D1 %', 8)}${pad('D1+played', 12)}${pad('D7', 6)}${pad('D7 people', 11)}`;
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const [source, s] of ranked) {
    console.log(
      pad(source, 18) +
      pad(s.people, 8) +
      pad(s.d1, 6) +
      pad(pct(s.d1, s.d1People ?? s.people), 8) +
      pad(s.d1Played, 12) +
      pad(s.d7, 6) +
      pad(s.d7People, 11)
    );
  }

  const reddit = bySource.get('reddit');
  console.log('');
  if (!reddit) {
    console.log('No Reddit cohort in the last 30 days.');
    return;
  }

  console.log(`Reddit: ${reddit.d1} of ${reddit.d1People ?? reddit.people} mature visitors returned D1 (${pct(reddit.d1, reddit.d1People ?? reddit.people)}), ${reddit.d1Played} of them played.`);
  console.log(`Reddit D7: ${reddit.d7} of ${reddit.d7People} mature visitors returned within 7 days.`);

  const redditDays = rows
    .filter(r => r.source === 'reddit')
    .sort((a, b) => a.cohort_day.localeCompare(b.cohort_day));

  console.log('\nREDDIT COHORTS\n');
  const head = `${pad('cohort day', 14)}${pad('people', 8)}${pad('D1', 6)}${pad('D1 %', 8)}${pad('D7', 6)}${pad('D7 %', 8)}status`;
  console.log(head);
  console.log('-'.repeat(head.length));
  for (const r of redditDays) {
    const people = Number(r.people);
    const d1 = Number(r.d1_returned);
    const d7 = Number(r.d7_returned);
    const d1Mature = r.cohort_day < today;
    const d7Mature = r.cohort_day <= addDays(today, -7);
    const d7Due = addDays(r.cohort_day, 7);
    const status = !d1Mature
      ? 'D1 not mature'
      : !d7Mature
        ? `D7 due ${d7Due}`
        : 'mature';
    console.log(
      pad(r.cohort_day, 14) +
      pad(people, 8) +
      pad(d1Mature ? d1 : '—', 6) +
      pad(d1Mature ? pct(d1, people) : '—', 8) +
      pad(d7Mature ? d7 : '—', 6) +
      pad(d7Mature ? pct(d7, people) : '—', 8) +
      status
    );
  }

  const pending = redditDays.filter(r => r.cohort_day > addDays(today, -7));
  if (pending.length) {
    const next = pending
      .map(r => ({ due: addDays(r.cohort_day, 7), people: Number(r.people) }))
      .sort((a, b) => a.due.localeCompare(b.due))[0];
    console.log(`\nD7 is still maturing for ${pending.reduce((n, r) => n + Number(r.people), 0)} Reddit visitors. Next check: ${next.due} (${next.people} people).`);
  } else if (reddit.d7People) {
    const rate = (100 * reddit.d7) / reddit.d7People;
    console.log(
      rate >= 10
        ? `\nVerdict: D7 holds at ${pct(reddit.d7, reddit.d7People)}. Reddit is a retention channel; double down.`
        : `\nVerdict: D7 is ${pct(reddit.d7, reddit.d7People)}. The 10.5% D1 was probably two people and a coin flip.`
    );
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
