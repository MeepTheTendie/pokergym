// Generates the scenario pages that pair one search question with one drill.
// Each page answers in the first sentence, shows the reasoning, and links to
// the exact authored hand (?drill=) or the five-hand practice (?practice=).
// Run: node scripts/build-scenarios.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const BASE = 'https://playpokergym.com';
const UPDATED = '2026-11-04';

import { scenarios } from './scenarios.mjs';



import { HEAD_ASSETS, header, footer } from './site-chrome.mjs';

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function gameName(slug) {
  if (slug.startsWith('blackjack-')) return 'Blackjack';
  if (slug.startsWith('video-poker-')) return 'Video poker';
  if (slug.startsWith('baccarat-')) return 'Baccarat';
  if (slug.startsWith('holdem-')) return 'Hold\u2019em';
  return 'Free trainers';
}

// Search-shaped title: game name first, "vs" instead of "against", plus the
// year, so the title starts with the words people actually type.
const GAME_WORD = [['blackjack-', 'Blackjack'], ['video-poker-', 'Video poker'], ['holdem-', 'Hold\u2019em'], ['baccarat-', 'Baccarat']];
export function seoTitle(s) {
  if (s.seoTitle) return s.seoTitle;
  let t = s.title.replace(/ against (?:a |an )?(?:dealer )?/i, ' vs ');
  const game = GAME_WORD.find(([prefix]) => s.slug.startsWith(prefix));
  const lower = t.toLowerCase();
  if (game && !lower.includes(game[1].toLowerCase().slice(0, 6)) && !lower.includes('jacks or better')) {
    t = `${game[1]} ${/^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t}`;
  }
  return `${t} (2026)`;
}

// Questions every learner asks about a hand, appended when a page has fewer than three.
const GAME_FAQ = {
  'blackjack-': ['Which blackjack rules is this answer for?', 'Six decks, dealer stands on soft 17, double after split allowed, no surrender. The free trainer grades with those exact rules and shows the expected value of each option.'],
  'video-poker-': ['Which pay table is this hold for?', 'Full-pay 9/6 Jacks or Better (9 for a full house, 6 for a flush), which returns about 99.54% with perfect play. The free trainer scores every hold against that table.'],
  'baccarat-': ['Is there a baccarat strategy that beats the house?', 'No. The draws are fixed by the tableau, so the only choice is the bet. Banker at about 1.06% is the cheapest; Tie at 8:1 is the most expensive at about 14.4%.'],
  'holdem-': ['How do I turn outs into odds quickly?', 'Use the rule of 4 and 2: multiply your outs by 4 on the flop (two cards to come) or by 2 on the turn. Nine flush outs is about 36% on the flop and 18% on the turn.'],
  'free-': ['Do I need an account or money to practice?', 'No. Play Poker Gym runs in the browser with no signup, no download and no real money; progress is saved on your device.'],
};

function enrich(s, all) {
  const prefix = Object.keys(GAME_FAQ).find(p => s.slug.startsWith(p));
  const faq = [...s.faq];
  if (faq.length < 3 && prefix && !faq.some(([q]) => q === GAME_FAQ[prefix][0])) faq.push(GAME_FAQ[prefix]);
  const related = [...s.related];
  for (const other of all) {
    if (related.length >= 4) break;
    if (other.slug === s.slug || related.some(([slug]) => slug === other.slug)) continue;
    if (prefix && other.slug.startsWith(prefix)) related.push([other.slug, other.title]);
  }
  return { ...s, faq, related, title: seoTitle(s), h1: s.title };
}

function page(s) {
  const url = `${BASE}/guides/${s.slug}/`;
  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: s.faq.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  const article = {
    '@type': 'Article',
    headline: s.title,
    description: s.description,
    datePublished: UPDATED,
    dateModified: UPDATED,
    author: { '@type': 'Organization', name: 'Play Poker Gym' },
    mainEntityOfPage: url,
  };
  const crumbs = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Play Poker Gym', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${BASE}/guides/` },
      { '@type': 'ListItem', position: 3, name: s.title, item: url },
    ],
  };
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.title)} — Play Poker Gym</title>
<meta name="description" content="${esc(s.description)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(s.title)}">
<meta property="og:description" content="${esc(s.description)}">
<meta property="og:type" content="article"><meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/og.png"><meta property="og:site_name" content="Play Poker Gym">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/web/icon.svg" type="image/svg+xml">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
${HEAD_ASSETS}
<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@graph': [article, faqSchema, crumbs] }, null, 2)}
</script>
</head><body>
${header('guides')}
<main id="main" class="wrap">
<p class="crumbs"><a href="/guides/">Guides</a> / ${esc(gameName(s.slug))}</p>
<div class="article-grid">
<article>
<p class="kicker">${esc(gameName(s.slug))} \u00b7 free practice, no signup</p>
<h1>${esc(s.h1 || s.title)}</h1>
<div class="felt answer-card">
<p class="kicker">The answer</p>
<p class="answer">${esc(s.answer)}</p>
</div>
<div class="play-row"><a class="cta" href="${s.cta[1]}">${esc(s.cta[0])} \u2192</a><span class="note">The coach grades your call and explains it. Free, no signup.</span></div>
<h2>Why</h2>
${s.why.map(p => `<p>${esc(p)}</p>`).join('\n')}
<p class="note">The trainer grades every decision against basic strategy, 9/6 Jacks or Better, or the standard baccarat tableau \u2014 the same answer you just read.</p>
<section class="faq">
<h2>Questions</h2>
${s.faq.map(([q, a]) => `<h3>${esc(q)}</h3>\n<p>${esc(a)}</p>`).join('\n')}
</section>
</article>
<aside>
<div class="box">
<h2>Related decisions</h2>
<ul class="links">
${s.related.map(([slug, label]) => `<li><a href="/guides/${slug}/">${esc(label)}</a></li>`).join('\n')}
</ul>
<p class="note"><a href="/guides/">All guides</a></p>
</div>
</aside>
</div>
</main>
${footer()}
<script src="/web/posthog-loader.js"></script></body></html>
`;
}

for (const scenario of scenarios) {
  const dir = path.join(root, 'public', 'guides', scenario.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'index.html'), page(enrich(scenario, scenarios)));
  console.log('wrote', path.relative(root, path.join(dir, 'index.html')));
}


// Hub page: one crawlable index so the scenario pages are not orphans even
// before the existing guides link to them.
const GROUPS = [
  ['Blackjack', slug => slug.startsWith('blackjack-')],
  ['Video poker', slug => slug.startsWith('video-poker-')],
  ['Baccarat', slug => slug.startsWith('baccarat-')],
  ["Hold'em", slug => slug.startsWith('holdem-')],
  ['Free trainers', slug => slug.startsWith('free-')],
];
const EXISTING = [
  ['Blackjack decisions', '/guides/blackjack/', 'Hard 16, soft 18 and a split decision.'],
  ['Jacks or Better hands', '/guides/jacks-or-better/', 'A high pair, a low pair and four to a royal.'],
  ['Baccarat odds', '/guides/baccarat/', 'House edge, commission and the tie payout.'],
  ["Hold'em best five", '/guides/holdem-best-five/', 'Playing the board, kickers and ace-low straights.'],
  ['Drill pack 01', '/guides/weekly-01/', 'Five blackjack decisions with a return-practice routine.'],
];

function hub() {
  const sections = GROUPS.map(([name, match]) => {
    const rows = scenarios.filter(s => match(s.slug));
    if (!rows.length) return '';
    return `<section class="game-card"><h2>${esc(name)}</h2><p class="count">${rows.length} guide${rows.length === 1 ? '' : 's'}</p>\n<ul class="links">\n${rows.map(s => `<li><a href="/guides/${s.slug}/">${esc(s.title)}</a></li>`).join('\n')}\n</ul></section>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Guides: one decision at a time — Play Poker Gym</title>
<meta name="description" content="Play Poker Gym (playpokergym.com) guides: each answers one blackjack, video poker, baccarat or Hold'em decision, with a free drill link. No signup.">
<link rel="canonical" href="${BASE}/guides/">
<meta property="og:title" content="Guides: one decision at a time">
<meta property="og:description" content="One question, one answer, one drill. Free practice with no signup.">
<meta property="og:type" content="website"><meta property="og:url" content="${BASE}/guides/">
<meta property="og:image" content="${BASE}/og.png"><meta property="og:site_name" content="Play Poker Gym">
<link rel="icon" href="/web/icon.svg" type="image/svg+xml">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
${HEAD_ASSETS}
</head><body>
${header('guides')}
<main id="main">
<div class="wrap hub-head">
<p class="kicker">Guides \u00b7 ${scenarios.length} decisions</p>
<h1>One decision at a time</h1>
<p class="lede">Each guide answers one question in its first sentence, shows the reasoning, then deals you that exact hand to practice.</p>
<div class="game-grid">
${sections}
</div>
<div class="box" style="margin-top:16px">
<h2>Longer guides</h2>
<ul class="links">
${EXISTING.map(([name, href, note]) => `<li><a href="${href}">${esc(name)}</a> <span class="note">${esc(note)}</span></li>`).join('\n')}
</ul>
</div>
</div>
<section class="felt drill-band" style="border-radius:0">
<div class="wrap">
<div><p class="kicker">The Daily Drill</p><h2>Five hands. Same for everyone. New every midnight.</h2><p>Finish, share your grid without spoilers, come back tomorrow.</p></div>
<a class="cta" href="/web/?ref=guide">Open the free trainer \u2192</a>
</div>
</section>
</main>
${footer()}
<script src="/web/posthog-loader.js"></script></body></html>
`;
}

mkdirSync(path.join(root, 'public', 'guides'), { recursive: true });
writeFileSync(path.join(root, 'public', 'guides', 'index.html'), hub());
console.log('wrote public/guides/index.html');
