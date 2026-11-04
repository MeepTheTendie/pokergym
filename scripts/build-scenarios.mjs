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



const CSS = `*{box-sizing:border-box}body{margin:0;background:#14121c;color:#eee9fa;font:18px/1.65 system-ui,sans-serif}main,header,footer{max-width:800px;margin:auto;padding:24px}a{color:#bde7ff}h1{font-size:clamp(28px,5vw,40px);line-height:1.25;margin:0 0 10px}h2{font-size:22px;margin-top:34px}.answer{font-size:clamp(20px,4vw,26px);font-weight:700;color:#a9e9bc;margin:18px 0;padding:16px 18px;border-left:6px solid #a9e9bc;background:#201c2b}.cta{display:inline-block;background:#a9e9bc;color:#14121c;padding:14px 22px;font-weight:700;text-decoration:none;margin:10px 0;border-radius:4px}.note,footer{font-size:15px;color:#c9bfe8}ul{padding-left:20px}footer{border-top:1px solid #4a4468;margin-top:40px}@media(max-width:450px){main,header,footer{padding:18px}}`;

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
<meta name="theme-color" content="#14121c"><link rel="icon" href="/web/icon.svg" type="image/svg+xml">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
<style>${CSS}</style>
<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@graph': [article, faqSchema, crumbs] }, null, 2)}
</script>
</head><body>
<header><a href="/">Play Poker Gym</a> · <a href="/web/">Free four-game trainer</a></header>
<main>
<p class="note">Free practice · no signup · no real money</p>
<h1>${esc(s.title)}</h1>
<p class="answer">${esc(s.answer)}</p>
${s.why.map(p => `<p>${esc(p)}</p>`).join('\n')}
<p><a class="cta" href="${s.cta[1]}">${esc(s.cta[0])} →</a></p>
<p class="note">The trainer grades every decision against basic strategy, 9/6 Jacks or Better, or the standard baccarat tableau — the same answer you just read.</p>
<p class="note">More: <a href="/guides/">all guides</a> · <a href="/web/">the free trainer</a></p>
<h2>Related decisions</h2>
<ul>
${s.related.map(([slug, label]) => `<li><a href="/guides/${slug}/">${esc(label)}</a></li>`).join('\n')}
</ul>
<h2>Questions</h2>
${s.faq.map(([q, a]) => `<h3>${esc(q)}</h3>\n<p>${esc(a)}</p>`).join('\n')}
</main>
<footer>Play Poker Gym · free blackjack, video poker, baccarat and Hold\u2019em practice in your browser. <a href="/web/privacy">Privacy</a></footer>
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
    return `<h2>${esc(name)}</h2>\n<ul>\n${rows.map(s => `<li><a href="/guides/${s.slug}/">${esc(s.title)}</a></li>`).join('\n')}\n</ul>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Guides: one decision at a time — Play Poker Gym</title>
<meta name="description" content="Play Poker Gym (playpokergym.com) is the free, no-signup trainer that grades every blackjack, video poker, baccarat and Hold'em decision and tells you why. Each guide answers one decision with a drill link.">
<link rel="canonical" href="${BASE}/guides/">
<meta property="og:title" content="Guides: one decision at a time">
<meta property="og:description" content="One question, one answer, one drill. Free practice with no signup.">
<meta property="og:type" content="website"><meta property="og:url" content="${BASE}/guides/">
<meta property="og:image" content="${BASE}/og.png"><meta property="og:site_name" content="Play Poker Gym">
<meta name="theme-color" content="#14121c"><link rel="icon" href="/web/icon.svg" type="image/svg+xml">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
<style>${CSS}</style>
</head><body>
<header><a href="/">Play Poker Gym</a> · <a href="/web/">Free four-game trainer</a></header>
<main>
<h1>Guides: one decision at a time</h1>
<p class="note">Each page answers one question in the first sentence, then links to the exact drill.</p>
${sections}
<h2>Longer guides</h2>
<ul>
${EXISTING.map(([name, href, note]) => `<li><a href="${href}">${esc(name)}</a> — ${esc(note)}</li>`).join('\n')}
</ul>
<p><a class="cta" href="/web/?ref=guide">Open the free trainer →</a></p>
</main>
<footer>Play Poker Gym · free blackjack, video poker, baccarat and Hold'em practice in your browser.</footer>
<script src="/web/posthog-loader.js"></script></body></html>
`;
}

mkdirSync(path.join(root, 'public', 'guides'), { recursive: true });
writeFileSync(path.join(root, 'public', 'guides', 'index.html'), hub());
console.log('wrote public/guides/index.html');
