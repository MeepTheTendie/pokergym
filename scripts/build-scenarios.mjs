// Generates the scenario pages that pair one search question with one drill.
// Each page answers in the first sentence, shows the reasoning, and links to
// the exact authored hand (?drill=) or the five-hand practice (?practice=).
// Run: node scripts/build-scenarios.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const BASE = 'https://playpokergym.com';
const UPDATED = '2026-10-28';

const scenarios = [
  {
    slug: 'baccarat-player-draws-on-five',
    title: 'Baccarat: Player has 5 — does Player draw?',
    description: 'Player draws on 0–5 and stands on 6–7. The third-card tableau in one minute, then practice free in Play Poker Gym.',
    answer: 'Yes. Player draws on 0–5 and stands on 6–7.',
    why: [
      'The Player hand is mechanical: the first two cards decide it, with no judgement and no optional draw. A total of 5 is always a draw.',
      'Banker is the hand with conditions. Banker draws on 0–5 unless the Player\u2019s third card changes the rule, which is why the printed tableau exists.',
    ],
    cta: ['Play five baccarat hands', '/web/?practice=baccarat&ref=guide'],
    related: [['baccarat-banker-player-tie-edge', 'Banker, Player or Tie: which is cheapest?'], ['blackjack-88-vs-10', '8-8 against a 10: split or hit?']],
    faq: [
      ['Does Player ever stand on 5 in baccarat?', 'No. Player stands only on 6 and 7. Every total from 0 to 5 draws.'],
      ['Is the Player bet better than Banker?', 'No. Banker has the lower house edge, about 1.06% against 1.24% for Player, before commission.'],
    ],
  },
  {
    slug: 'video-poker-pair-of-jacks-or-four-to-a-flush',
    title: 'Jacks or Better: pair of jacks or 4-card flush?',
    description: 'A high pair beats four to a flush in Jacks or Better. See why, then play the exact hand free in Play Poker Gym.',
    answer: 'Hold the pair of jacks.',
    why: [
      'A high pair is a made paying hand. Four to a flush is only a draw: it completes about once in five attempts (9 of the 47 unseen cards).',
      'That is the opposite of the low-pair decision. With a low pair against four to a flush, the flush draw is worth more because the pair pays nothing on its own.',
    ],
    cta: ['Play this exact hand', '/web/?drill=vp-jacks-flush&ref=guide'],
    related: [['video-poker-two-pair-hold-both', 'Two pair: hold both or chase trips?'], ['blackjack-soft-18-vs-9', 'Soft 18 against a 9: hit or stand?']],
    faq: [
      ['Does a pair of jacks beat a flush draw in Jacks or Better?', 'Yes. The high pair already pays even money; four to a flush misses about 80% of the time.'],
      ['What about a low pair against four to a flush?', 'Then keep the flush draw. A low pair pays nothing without improvement, and the draw is the stronger hold.'],
    ],
  },
  {
    slug: 'blackjack-88-vs-10-split',
    title: '8-8 against a dealer 10: split or hit?',
    description: 'Always split eights, even against a 10. The reason is simple: 16 is the worst hand in blackjack. Practice the exact deal free.',
    answer: 'Split. Eights are the one pair you split against every dealer card.',
    why: [
      'Sixteen is the worst total in the game: you bust on any ten and you lose to every pat hand. Standing on 16 against a 10 loses most of the time.',
      'Splitting turns one hopeless 16 into two hands that each start with an 8. Neither is a favourite, but both are better than the single 16 you would otherwise hold.',
    ],
    cta: ['Play this exact hand', '/web/?drill=bj-88-v10&ref=guide'],
    related: [['blackjack-soft-18-vs-9', 'Soft 18 against a 9: hit or stand?'], ['video-poker-two-pair-hold-both', 'Two pair: hold both or chase trips?']],
    faq: [
      ['Do you always split eights?', 'Yes. Against every dealer upcard, splitting two 8s is better than hitting, standing or doubling a 16.'],
      ['Should you split eights against a 10 when doubling is allowed?', 'Yes. The split is still correct; the alternative is standing on 16, which is the worst hand you can hold.'],
    ],
  },
  {
    slug: 'holdem-pocket-pair-flop-a-set',
    title: 'Pocket pair: how often do you flop a set?',
    description: 'About 11.8%, roughly one time in 8.5. The two-card maths, and a free Hold\u2019em hand-reading drill.',
    answer: 'About 11.8% — roughly once in 8.5 flops.',
    why: [
      'Two of the 50 unseen cards make your set on the flop. The flop is three cards, so the chance at least one of them is yours is 1 \u2212 (48/50 \u00d7 47/49 \u00d7 46/48) \u2248 11.8%.',
      'That number is why small pairs need implied odds. You miss most flops, so the pot has to pay enough when you do hit.',
    ],
    cta: ['Practice five Hold\u2019em hands', '/web/?practice=holdem&ref=guide'],
    related: [['holdem-flush-draw-odds-by-the-river', 'Flush draw on the flop: how often do you get there?'], ['blackjack-88-vs-10', '8-8 against a 10: split or hit?']],
    faq: [
      ['What are the odds of flopping a set with a pocket pair?', 'About 11.8%, or roughly 1 in 8.5.'],
      ['Does a set beat a flush draw?', 'A set is already a made hand. A flush draw on the flop completes by the river about 35% of the time.'],
    ],
  },
  {
    slug: 'baccarat-banker-player-tie-edge',
    title: 'Baccarat: Banker, Player or Tie — lowest edge?',
    description: 'Banker is about 1.06%, Player about 1.24%, Tie about 14.4% at 8:1. The three numbers, then practice free.',
    answer: 'Banker, at about 1.06% house edge after the 5% commission.',
    why: [
      'Banker wins slightly more often than Player, which is why the casino takes a 5% commission on it. Even after that commission it keeps the lowest edge.',
      'Player is close behind at roughly 1.24%. Tie looks tempting at 8:1, but the true chance is about 9.5%, so its edge is around 14.4%.',
    ],
    cta: ['Practice five baccarat hands', '/web/?practice=baccarat&ref=guide'],
    related: [['baccarat-player-draws-on-five', 'Player has 5: does Player draw?'], ['blackjack-soft-18-vs-9', 'Soft 18 against a 9: hit or stand?']],
    faq: [
      ['What is the house edge on Banker in baccarat?', 'About 1.06% on the standard 5% commission.'],
      ['Is the Tie bet ever worth it?', 'No. At 8:1 it needs a 11.1% hit rate to break even, and it lands about 9.5% of the time.'],
    ],
  },
  {
    slug: 'blackjack-soft-18-vs-9',
    title: 'Soft 18 (A-7) against a 9: hit or stand?',
    description: 'Hit soft 18 against a 9. The ace keeps the hand flexible, and standing loses more often. Play the exact deal free.',
    answer: 'Hit.',
    why: [
      'Soft 18 is not a strong 18. Against a 9, standing gives the dealer two chances to make a pat hand that beats you.',
      'Hitting cannot bust: the ace counts as one, so you keep a total even if you draw a ten. The flexibility is the whole point of the soft total.',
    ],
    cta: ['Play this exact hand', '/web/?drill=bj-soft18-v9&ref=guide'],
    related: [['blackjack-88-vs-10', '8-8 against a 10: split or hit?'], ['video-poker-pair-of-jacks-or-four-to-a-flush', 'Jacks or Better: pair or flush draw?']],
    faq: [
      ['Do you hit soft 18 against a 9?', 'Yes. Basic strategy hits soft 18 against 9, 10 and ace, and stands against 2, 7 and 8.'],
      ['Can you bust by hitting soft 18?', 'No. The ace drops to one, so the hand stays soft and cannot bust on the next card.'],
    ],
  },
  {
    slug: 'video-poker-two-pair-hold-both',
    title: 'Video poker: two pair — hold both or chase trips?',
    description: 'Hold both pairs. Two pair already pays; chasing trips throws away a paying hand for a long shot. Practice the exact deal free.',
    answer: 'Hold both pairs.',
    why: [
      'Two pair pays 2-for-1 in Jacks or Better. Breaking it to chase trips turns a paying hand into a draw that completes rarely.',
      'The full house is the only reason to keep both, and that happens by drawing to the two pair, not by discarding one of them.',
    ],
    cta: ['Play this exact hand', '/web/?drill=vp-two-pair&ref=guide'],
    related: [['video-poker-pair-of-jacks-or-four-to-a-flush', 'Jacks or Better: pair or flush draw?'], ['holdem-flush-draw-odds-by-the-river', 'Flush draw on the flop: how often?']],
    faq: [
      ['Should you ever break two pair in Jacks or Better?', 'Not to chase trips or a straight. Holding both pairs keeps the paying hand and the full-house draw.'],
      ['Do both pairs have to be high pairs?', 'No. Two pair pays regardless of rank, which is why it is kept over a low pair.'],
    ],
  },
  {
    slug: 'holdem-flush-draw-odds-by-the-river',
    title: 'Flush draw on the flop: odds you hit by the river?',
    description: 'About 35% with two cards to come. The 9-out maths, and a free Hold\u2019em drill to practise reading the board.',
    answer: 'About 35% — roughly one time in three.',
    why: [
      'A flush draw on the flop has 9 outs. With two cards to come the chance of at least one is 1 \u2212 (38/47 \u00d7 37/46) \u2248 35%.',
      'Calling a bet on the flop alone uses the one-card number, about 19%. The bigger figure only applies if you expect to see both cards.',
    ],
    cta: ['Practice five Hold\u2019em hands', '/web/?practice=holdem&ref=guide'],
    related: [['holdem-pocket-pair-flop-a-set', 'Pocket pair: how often do you flop a set?'], ['video-poker-two-pair-hold-both', 'Two pair: hold both or chase trips?']],
    faq: [
      ['What are the odds of hitting a flush draw by the river?', 'About 35% with two cards to come, using 9 outs.'],
      ['What are the odds on the turn alone?', 'About 19%, or roughly 1 in 5.2.'],
    ],
  },
];

const CSS = `*{box-sizing:border-box}body{margin:0;background:#14121c;color:#eee9fa;font:18px/1.65 system-ui,sans-serif}main,header,footer{max-width:800px;margin:auto;padding:24px}a{color:#bde7ff}h1{font-size:clamp(28px,5vw,40px);line-height:1.25;margin:0 0 10px}h2{font-size:22px;margin-top:34px}.answer{font-size:clamp(20px,4vw,26px);font-weight:700;color:#a9e9bc;margin:18px 0;padding:16px 18px;border-left:6px solid #a9e9bc;background:#201c2b}.cta{display:inline-block;background:#a9e9bc;color:#14121c;padding:14px 22px;font-weight:700;text-decoration:none;margin:10px 0;border-radius:4px}.note,footer{font-size:15px;color:#c9bfe8}ul{padding-left:20px}footer{border-top:1px solid #4a4468;margin-top:40px}@media(max-width:450px){main,header,footer{padding:18px}}`;

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
<h2>Related decisions</h2>
<ul>
${s.related.map(([slug, label]) => `<li><a href="/guides/${slug}/">${esc(label)}</a></li>`).join('\n')}
</ul>
<h2>Questions</h2>
${s.faq.map(([q, a]) => `<h3>${esc(q)}</h3>\n<p>${esc(a)}</p>`).join('\n')}
</main>
<footer>Play Poker Gym · free blackjack, video poker, baccarat and Hold\u2019em practice in your browser. <a href="/web/privacy">Privacy</a></footer>
</body></html>
`;
}

for (const scenario of scenarios) {
  const dir = path.join(root, 'public', 'guides', scenario.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'index.html'), page(scenario));
  console.log('wrote', path.relative(root, path.join(dir, 'index.html')));
}
