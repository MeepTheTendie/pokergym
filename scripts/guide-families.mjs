// Groups the one-question guides by game and by hand family, so the game hubs
// can list every guide of their game and each guide's "Related decisions" can
// pick neighbours that a learner would compare it with (stiff hands with stiff
// hands, doubles with doubles, splits with splits, holds with holds, odds with
// odds). A new guide that is not listed in a family still lands on its game hub
// under "More ... guides" (by slug prefix), so the hubs stay complete.

export const HUBS = {
  blackjack: { href: '/guides/blackjack/', file: 'public/guides/blackjack/index.html', label: 'All blackjack strategy guides', chart: ['blackjack-basic-strategy-trainer', 'Practice blackjack basic strategy online, free'], heading: 'Every blackjack strategy guide', intro: 'One question per page. Every answer assumes six decks, the dealer standing on soft 17 and double after split, the rules the free trainer deals and grades.' },
  videopoker: { href: '/guides/jacks-or-better/', file: 'public/guides/jacks-or-better/index.html', label: 'All Jacks or Better strategy guides', chart: ['video-poker-strategy-trainer', 'Learn video poker strategy free: a Jacks or Better trainer'], heading: 'Every Jacks or Better guide', intro: 'One hold question per page, each solved for full-pay 9/6 Jacks or Better (9 for a full house, 6 for a flush).' },
  baccarat: { href: '/guides/baccarat/', file: 'public/guides/baccarat/index.html', label: 'All baccarat guides: odds and third-card rules', heading: 'Every baccarat guide', intro: 'Baccarat has no playing decisions, so these pages cover the third-card rules and what each bet costs, with a 5% commission on Banker and Tie paying 8:1.' },
  holdem: { href: '/guides/holdem-best-five/', file: 'public/guides/holdem-best-five/index.html', label: 'All Hold\u2019em odds and hand-reading guides', heading: 'Every Hold\u2019em guide', intro: 'Drawing odds and preflop matchups, each counted only from the cards you can see, plus free hand-reading practice.' },
};

// [game, family key, hub subheading, slugs in reading order]
export const FAMILIES = [
  ['blackjack', 'bj-hard', 'Hard totals: hit or stand', ['blackjack-12-vs-2-hit', 'blackjack-13-vs-2-stand', 'blackjack-15-vs-10-hit', 'blackjack-16-vs-10-hit', 'blackjack-17-vs-10-stand']],
  ['blackjack', 'bj-double', 'Hard 9, 10 and 11: double or hit', ['blackjack-9-vs-2-hit', 'blackjack-10-vs-9-double', 'blackjack-11-vs-10-double', 'blackjack-11-vs-ace-hit']],
  ['blackjack', 'bj-soft', 'Soft hands', ['blackjack-soft-16-hands', 'blackjack-soft-17-vs-2-hit', 'blackjack-soft-18-vs-3-double', 'blackjack-soft-18-vs-9']],
  ['blackjack', 'bj-pairs', 'Pairs: split or not', ['blackjack-aces-vs-10-split', 'blackjack-22-vs-9-hit', 'blackjack-44-vs-5-split', 'blackjack-55-vs-6-double', 'blackjack-88-vs-10-split', 'blackjack-99-vs-7-stand', 'blackjack-1010-vs-6-stand']],
  ['blackjack', 'bj-practice', 'Basic strategy practice and free trainers', ['blackjack-basic-strategy-trainer', 'free-blackjack-trainer', 'free-blackjack-trainer-alternatives']],
  ['videopoker', 'vp-holds', 'Which cards to hold', ['video-poker-nothing-hand-hold', 'video-poker-low-pair-or-three-to-a-royal', 'video-poker-four-to-a-flush-vs-low-pair', 'video-poker-pair-of-jacks-or-four-to-a-flush', 'video-poker-two-pair-hold-both', 'video-poker-trips-or-flush-draw']],
  ['videopoker', 'vp-practice', 'Pay table and free practice', ['video-poker-96-pay-table', 'video-poker-strategy-trainer', 'free-video-poker-trainer']],
  ['baccarat', 'bac-rules', 'Third-card rules', ['baccarat-player-draws-on-five', 'baccarat-player-six-stands']],
  ['baccarat', 'bac-odds', 'Odds and house edge', ['baccarat-banker-player-tie-edge', 'baccarat-how-often-banker-wins', 'baccarat-odds-of-losing-6-in-a-row']],
  ['baccarat', 'bac-practice', 'Free practice', ['baccarat-strategy-trainer', 'free-baccarat-practice']],
  ['holdem', 'he-odds', 'Drawing and preflop odds', ['holdem-flush-draw-odds-by-the-river', 'holdem-flush-draw-turn-odds', 'holdem-open-ended-straight-draw-odds', 'holdem-gutshot-odds', 'holdem-pocket-pair-flop-a-set', 'holdem-ak-vs-pocket-pair']],
  ['holdem', 'he-practice', 'Free practice', ['free-holdem-trainer']],
  // Four-game pages: no single hub, but each hub lists the daily drill.
  [null, 'site', 'Free practice', ['free-daily-poker-drill', 'free-poker-gym-which-site']],
];

// Hand-built drill packs, linked from the guides whose hands they replay.
export const DRILL_PACKS = [
  ['/guides/weekly-01/', 'Blackjack drill pack 01: 5 decisions to practice', ['blackjack-soft-18-vs-9', 'blackjack-88-vs-10-split', 'blackjack-99-vs-7-stand', 'blackjack-9-vs-2-hit', 'blackjack-basic-strategy-trainer']],
];

// Guides that cover every game and belong on every hub's practice list.
export const ALL_HUBS = ['free-daily-poker-drill'];

const PREFIX = [['blackjack-', 'blackjack'], ['video-poker-', 'videopoker'], ['baccarat-', 'baccarat'], ['holdem-', 'holdem']];

export function familyOf(slug) {
  const row = FAMILIES.find(([, , , slugs]) => slugs.includes(slug));
  if (row) return { game: row[0], key: row[1], heading: row[2], slugs: row[3] };
  const game = PREFIX.find(([p]) => slug.startsWith(p))?.[1] ?? null;
  return { game, key: `${game}-more`, heading: 'More guides', slugs: [slug] };
}

export const gameOf = slug => familyOf(slug).game;

// Every guide a hub lists, grouped by family in hub order: the families above,
// then any unlisted guide of that game, then the four-game practice pages.
export function hubSections(game, scenarios) {
  const known = new Set(scenarios.map(s => s.slug));
  const sections = FAMILIES.filter(([g]) => g === game)
    .map(([, key, heading, slugs]) => ({ key, heading, slugs: slugs.filter(slug => known.has(slug)) }));
  const listed = new Set(sections.flatMap(s => s.slugs));
  const extra = scenarios.map(s => s.slug).filter(slug => !listed.has(slug) && gameOf(slug) === game);
  if (extra.length) sections.push({ key: `${game}-more`, heading: 'More guides', slugs: extra });
  const practice = sections.find(s => /practice/.test(s.key));
  for (const slug of ALL_HUBS) if (known.has(slug) && practice && !practice.slugs.includes(slug)) practice.slugs.push(slug);
  return sections.filter(s => s.slugs.length);
}

// Neighbours for "Related decisions": the same hand family first (nearest in
// reading order, alternating after/before so links spread evenly), then the
// page's own hand-picked links from the same game, then the rest of the game.
export function relatedSlugs(slug, curated, scenarios, max = 5) {
  const fam = familyOf(slug);
  const out = [];
  const add = other => {
    if (out.length < max && other !== slug && !out.includes(other) && scenarios.some(s => s.slug === other)) out.push(other);
  };
  const i = fam.slugs.indexOf(slug);
  for (let d = 1; d < fam.slugs.length; d++) {
    add(fam.slugs[(i + d) % fam.slugs.length]);
    add(fam.slugs[(i - d + fam.slugs.length) % fam.slugs.length]);
  }
  const sameGame = other => fam.game ? gameOf(other) === fam.game : true;
  // Hand-picked links stay if they are the same game or a four-game page.
  for (const other of curated) if (sameGame(other) || gameOf(other) === null) add(other);
  for (const s of scenarios) {
    if (fam.game ? gameOf(s.slug) === fam.game : s.slug.startsWith('free-')) add(s.slug);
  }
  return out;
}
