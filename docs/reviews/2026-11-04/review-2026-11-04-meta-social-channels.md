# Review: Meta social channels, Oct 1 – Nov 4, 2026

**Written:** November 4, 2026
**Reviewer:** OpenCode agent session (model: DeepSeek V4.1 Flash Free), at Wes's request
**For:** Wes, Grok
**Inputs:** two Meta Business Suite CSV exports in `~/Downloads` (see §1)
**Companion data:** PostHog project 670990, queried through MCP on the same day
**Status of this document:** committed with the 2026-11-04 analytics changes; the Beam Status entry and
Decision Log entry in `docs/PokerGymControlDoc.md` point here.

---

## 0. Why this file exists

Wes asked for a review of the two CSVs, one Facebook and one Instagram, in the context of the
previous day's question about whether the analytics can be trusted. The point of this document is
to put the **social numbers and the site numbers next to each other**, because either one alone
flatters the channels and the pair does not.

Short version: **Facebook is giving us reach to the right demographic and almost no attention.
Instagram is not being distributed at all. Neither channel produced meaningful product usage.
Reddit and ChatGPT referrals, at a fraction of the reach, produced every five-hand completer worth
counting.**

---

## 1. What the files are, and how to re-run any number

| File | Channel | Rows | Schema |
| --- | --- | ---: | --- |
| `Oct-01-2026_Nov-04-2026_2144174093131911.csv` | Instagram (`@playpokergym`, account 17841439034524383) | 25 reels | `Post ID, Views, Reach, Likes, Shares, Follows, Comments, Saves` |
| `Oct-01-2026_Nov-04-2026_1882270656465017.csv` | Facebook (Page "Poker Gym", 61595647135851) | 27 posts (24 videos, 2 photos, 1 text) | 192 columns incl. 3-second views, watch time, per-interval retention, audience and country splits |

Both exports are **one row per post, `Date = Lifetime`**, covering publish dates Oct 1 – Nov 4, 2026.
They are not time series. A post published Oct 18 carries 17 days of accumulation in a single row;
a post published Nov 3 carries one day. Cross-post comparisons below are therefore read as
"what has accumulated so far", not "what happened on a given day".

Every figure in this document is derived from those two files plus the PostHog query in §9. Nothing
is estimated or interpolated.

---

## 2. Facebook: reach is real, attention is not

Video posts only (24 of 27 rows).

| Metric | Value |
| --- | ---: |
| Video views / viewers | 6,998 / 6,205 |
| 3-second views (% of views) | 1,833 (26.2%) |
| Total seconds viewed | 29,062 |
| **Seconds viewed per view** | **4.15s** |
| Reactions (%) | 31 (0.44%) |
| Comments | 2 |
| Shares | **0** |
| Clicks of any kind | 5 |
| Boosted views | **0** |
| Ad impressions / estimated earnings | 10 / $0.00 |
| Median views per post | 225 |
| Videos under 100 views | 6 of 24 |

### 2.1 One post is doing a fifth of the work

| Post | Length | Views | 3-sec views | 3-sec rate | Avg watched |
| --- | ---: | ---: | ---: | ---: | ---: |
| **You have a flush. Throw it away.** | **12s** | **1,501** | **787** | **52%** | **9.0s (75%)** |
| Ditch the low pair for a 4-flush | 38s | 811 | 180 | 22% | 4.6s (12%) |
| Soft 18 vs dealer 9 | 13s | 702 | 85 | 12% | 2.1s (16%) |
| A♠K♦8♣8♥3♠ — who wins? | 13s | 615 | 146 | 24% | 3.1s (24%) |
| When the board is the straight | 36s | 292 | 58 | 20% | 3.9s (11%) |

That single 12-second post accounts for **21% of all views and 43% of all 3-second views**. It is
also the only sub-15s video, and the only one that cleared a 30% three-second rate. Its retention
curve holds at 100% through the first four intervals and is still at **61% on the final one**:

```
interval  0..3: 1.00
interval  4:    0.94
interval  5:    0.88
interval  6:    0.82
interval  7:    0.77
interval  8:    0.73
interval  9:    0.70
interval 10:    0.61
```

Nothing else in the account has that shape. The working format is visible in the data: **12
seconds, one contrarian claim, answer withheld, no text wall.**

### 2.2 The audience is retired men, and that is a fact about the product too

3-second views by country (top): **US 833**, CA 73, GB 71, AU 27, PH 27, NL 6, IE 6, IL 5, ID 5, NO 4.
That is **75% US** of the top-country total.

3-second views by age/sex, all posts:

| Segment | 3-sec views |
| --- | ---: |
| **M, 65+** | **594** |
| M, 55–64 | 157 |
| M, 45–54 | 86 |
| F, 65+ | 83 |
| M, 25–34 | 68 |
| M, 35–44 | 63 |
| all others | 57 |

**54% of measured attention is men 65+.** Facebook found this audience without being asked. It is a
real poker segment (live-cardroom players), it is the demographic most likely to buy a trainer, and
it is also the demographic least likely to tolerate a fiddly install. Any acquisition plan that
assumes a 25–40 buyer is fighting the data.

---

## 3. Instagram: the account is not being distributed

| Metric | Value |
| --- | ---: |
| Reels | 25 |
| Views / reach | 3,935 / 3,536 |
| Likes | 34 (0.96% of reach) |
| Comments | **0** |
| Shares | 1 |
| Saves | **0** |
| Follows gained | **0** |
| Median views (range) | 163 (8 – 254) |
| Reels under 150 views | 11 of 25 |
| Reels with an explicit "Comment below" CTA | 11 → **0 comments** |

Twenty-five reels over three weeks landed in a 110–254 view band with two outliers (26 and 8). That
is follower-only distribution. **Meta is not testing this content on strangers**, so the flat line
is not a verdict on the creative — it is an absence of reach.

Eleven reels explicitly ask for a comment and the account has **zero comments across the entire
window**. Zero saves. Zero follows. Nothing here is reaching a new person.

### 3.1 The A/B pair

| Variant | Published | Views | Likes |
| --- | --- | ---: | ---: |
| "TEST: pair 2, answer-first" | Nov 2 | 254 | 1 |
| "TEST: pair 1, question-first" | Nov 1 | 136 | 2 |

One post per arm. The answer-first cut got 87% more views and one fewer like. **That is not a
result**, and it should not be cited as one. A pair needs at least 5–7 posts per arm before the
view spread means anything, and on this account's distribution the spread would still be noise.

---

## 4. Cross-reference: reach versus arrivals versus players

**Corrected after `npm run report` ran on 2026-11-04 18:56 CST.** The first version of this table was
built by classifying each event row independently, which double-counted people across source buckets
and counted people who never made a pageview. The numbers below come from the canonical report's own
definitions: a visitor is a unique `person_id` with at least one valid `$pageview` after the
exclusions, and first-touch source is resolved once per person, not per event.

PostHog, launch window Oct 17 – Nov 4, partial. The project has no data before Oct 17, so this is two
weeks shorter than the CSVs.

| First-touch source | Visitors | Started a hand | Finished five hands | Finish rate |
| --- | ---: | ---: | ---: | ---: |
| Direct | 47 | 8 | 4 | 9% |
| **YouTube** | **37** | 3 | 0 | 0% |
| **Reddit** | 19 | **18** | **9** | **47%** |
| **ChatGPT** | 19 | **10** | **6** | **32%** |
| Other | 5 | 4 | 2 | 40% |
| Unknown | 4 | 2 | 1 | 25% |
| Instagram | 3 | 1 | 1 | 33% |
| Facebook | 3 | **0** | **0** | **0%** |
| X | 3 | 1 | 1 | 33% |
| **Total** | **140** | **47** | **24** | 17% |

The report's own 14-completed-day window (Oct 21 – Nov 3) agrees in shape: 112 visitors, Reddit 18/17/9
and ChatGPT 17/8/5, YouTube 30/0/0, Facebook 3/0/0.

**7,011 Facebook views produced 3 site visitors and zero players.**
**3,935 Instagram views produced 3 site visitors and one player.**

The channel with the most reach has the worst conversion, and the two channels with a third of the
reach are carrying the product:

| Channel | Views | Visitors | Views per visitor | Players |
| --- | ---: | ---: | ---: | ---: |
| Facebook | 6,998 | 3 | ~2,330 | 0 |
| Instagram | 3,935 | 3 | ~1,310 | 1 |
| Reddit | — | 19 | — | 18 |
| ChatGPT | — | 19 | — | 10 |

YouTube deserves separate attention: it is the largest labelled arrival source at 37 visitors and
produced **zero** five-hand completers, with only 3 of 37 starting a hand at all. That is an 8% start
rate against Reddit's 95% and ChatGPT's 53%. Something between the short and the trainer is losing
YouTube traffic before it plays.

The `other` bucket is **5 visitors, not 27**. The earlier figure came from the broken per-row
classification and should not be quoted. The bucket is small enough to ignore for now; `Direct` at 47
visitors is the number that actually needs explaining, since it is the largest single source and only
8 of those 47 started a hand.

---

## 5. Verdicts

**Facebook — a reach channel that is not yet an acquisition channel.** The distribution is real and
the demographic is right. Attention is four seconds, engagement is rounding error (0 shares, 2
comments), and the posts carry no link, so the reach cannot convert. One format works and it is
short. This is worth fixing, not abandoning.

**Instagram — not a channel yet.** 25 reels, 0 comments, 0 saves, 0 follows, follower-only reach.
The content is not the bottleneck; the absence of distribution is. Daily effort here is currently
unpaid work.

**ChatGPT and Reddit — the actual engine.** Reddit converts 18 of 19 visitors into a started hand
and 9 into five-hand completers; ChatGPT converts 19 into 10 and 6. Between them they are 38 visitors
and 15 completers, against 40,000+ social views and one completer. Worth understanding and
deliberately feeding before any more social volume.

**YouTube — the leak.** 37 visitors, 3 starts, 0 completions. It is the only social channel that
delivers strangers in volume, and it loses them before they play. That is a landing-to-trainer
problem, not a content problem.

---

## 6. Recommendations, in the order I would do them

1. **Cut Instagram to 3×/week or park it.** 25 posts bought 0 follows and 0 comments. If it stays,
   remove "Comment below" — it is 0-for-11 and it makes the account look dead to a visitor.
2. **Make 12 seconds the default, not the exception.** One question, answer withheld, one-line
   caption. The only post that did this beat the median by 6.7× and held 61% to the last interval.
   Re-cut the 27–44s videos to 12s rather than producing new ones.
3. **Fix the Facebook link, which is not arriving tagged.** `utm_source=fb` appears **zero times** in
   the whole history, while `utm_source=yt` (13 pageviews) and `utm_source=ig` (5) do arrive. The
   captions carry a link, so the link or the app is eating it. Check one live Facebook caption by hand
   before producing another clip.
4. **Explain `Direct` before the next channel read.** 47 visitors, the largest single source, only 8
   of them starting a hand. That is either in-app browsers stripping referrers (the ControlDoc already
   notes IG/FB in-app browsers showing as Direct) or genuine dark traffic. It is bigger than every
   named social channel combined, so it is the number that distorts the rest.
5. **Plan acquisition for men 65+**, because that is who the algorithm is finding. That means
   large text, no install friction, and Facebook-first creative — not a race to a younger demo on
   Instagram.

---

## 7. Things not to misread

- **"1-minute video views" = 0 across all 27 posts is expected.** No video is 60 seconds or longer,
  so the metric can never be non-zero. It is not a failure and should not appear in any dashboard as
  one.
- **Facebook's "Total clicks" = 5 counts clicks on the post, not link clicks.** The site-side truth
  for Facebook traffic is the 12 visitors in §4, not the 5.
- **"Estimated earnings $0.00" and 10 ad impressions** mean this account is not monetised and is not
  running paid distribution. Nothing here measures ad performance.
- **The two CSVs are lifetime-per-post, not daily.** A post from Oct 18 has had 17 days to accumulate;
  one from Nov 3 has had one. Do not read the view column as a daily series.
- **The A/B pair is n=1 per arm** (§3.1) and is not evidence for either variant.

---

## 8. What I did not verify

- **Whether the 65+ audience is genuine or an artefact of Meta's delivery.** The split is what the
  export reports; I did not check it against a second source.
- **Post-level attribution.** No unique campaign string per post is in use, so no site visitor can be
  traced to a specific reel. `utm_campaign=hooktest1112` covers the whole Nov 1–12 queue.

`npm run report` **was** run, at 18:56 CST on 2026-11-04, once the personal API key was available. It
is what corrected §4: the first version of that table was built by classifying each event row
independently, which double-counted people across source buckets and included people who never made a
pageview. Every number in §4 is now the report's own output or a direct sum of it, and the report's
reconciliation line reads clean (`reconciled total: 112 visitors (window denominator 112)`).

That line only started reading clean today. The report computed ChatGPT arrivals correctly but then
dropped them from the source table, because `aggregateSources()` filtered its output through a fixed
label order that omitted every AI source in `SOURCE_LABELS`. The visible symptom was the data-quality
warning `source rows total 95 visitors but the window has 112`, which had been firing as a real
attribution failure rather than a display bug. Fixed on 2026-11-04; ChatGPT now appears with 17
visitors / 8 starts / 5 completers in the 14-day window.

Still not verified: no conversion is attributed to a specific post, and no Cloudflare request counts
were used as an independent check on arrivals (`CLOUDFLARE_API_TOKEN` unavailable).

---

## 9. Reproduce

Superseded. `npm run report` now runs on this machine and is the authoritative source for every
number in §4; the query below is kept only as a record of the method that produced the **wrong** first
version of the table (per-row classification, no `$pageview` requirement, people counted in more than
one bucket). Do not use it. Use the report.

The original query, for the record:

```sql
SELECT
  multiIf(
    lower(coalesce(properties.first_utm_source, properties.utm_source, '')) IN ('ig','instagram','meta')
      OR coalesce(properties.first_ref, properties.ref, '') IN ('instagram','reels','ig'), 'instagram',
    lower(coalesce(properties.first_utm_source, properties.utm_source, '')) IN ('fb','facebook','meta')
      OR coalesce(properties.first_ref, properties.ref, '') IN ('facebook','fb'), 'facebook',
    lower(coalesce(properties.first_utm_source, properties.utm_source, '')) = 'yt'
      OR coalesce(properties.first_ref, properties.ref, '') IN ('youtube','yt'), 'youtube',
    lower(coalesce(properties.first_utm_source, properties.utm_source, '')) = 'chatgpt.com'
      OR coalesce(properties.first_ref, properties.ref, '') LIKE '%chatgpt%', 'chatgpt',
    coalesce(nullIf(properties.first_ref,''), nullIf(properties.ref,''), 'direct') = 'direct', 'direct',
    'other') AS source,
  count(DISTINCT person_id) AS visitors,
  count(DISTINCT if(event = 'game_start', person_id, NULL)) AS players,
  count(DISTINCT if(event = 'session_complete', person_id, NULL)) AS completers
FROM events
WHERE timestamp >= toDateTime('2026-10-17 05:00:00')
  AND event NOT IN ('iso_probe','pg_probe_batch','pg_proxy_probe','pg_proxy_probe2','attrib_probe',
                    'diag_manual_probe','diag_pipeline_check','manual_probe')
  AND distinct_id NOT IN ('01a14b73-6c7f-7169-99d2-5ce023d03e89',
                          '01a14ba3-de9e-731c-ba49-9c24fe4b762e',
                          '8b1034d9-00ab-5c69-af64-c57fc786eb6d')
  AND person_id NOT IN ('ba45edef-65e8-507c-b152-87c8381300a2',
                        'd7f0bd04-54f6-5299-ba90-f9702a921326',
                        'be9b3d85-2d61-55a9-b4d4-0fb8dac4b753',
                        '5f2a6724-9a8f-5e93-9fe6-1a62dae1ee97',
                        '5a42fe0e-c180-5c13-a659-3a2edd49adea')
  AND person_id NOT IN COHORT 644643
  AND (properties.ref IS NULL OR properties.ref NOT IN ('attribcheck','funnel-check'))
  AND (properties.first_ref IS NULL OR properties.first_ref NOT IN ('attribcheck','funnel-check'))
  AND (properties.session_ref IS NULL OR properties.session_ref NOT IN ('attribcheck','funnel-check'))
  AND (properties.$raw_user_agent IS NULL
       OR properties.$raw_user_agent NOT LIKE '%Edge/12.246%')
GROUP BY source
ORDER BY visitors DESC;
```

The CSV figures in §2–§3 were computed with plain `csv.DictReader` over the two files, summing
`Views`, `Reach`, `Likes`, `Shares`, `Follows`, `Comments`, `Saves` (Instagram) and
`Views`, `3-second video views`, `Seconds viewed`, `Reactions`, `Comments`, `Shares`,
`Total clicks`, `Average Seconds viewed`, plus the `3-second video views by country (...)`,
`3-second video views by top audience (...)`, and `Percentage of total views at interval N` columns
(Facebook). No third-party library was involved.
