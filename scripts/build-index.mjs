// Regenerates the sitemap and the two assistant-facing text files from the same
// scenario list the pages are built from. Run after build-scenarios.mjs.
//   node scripts/build-index.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { scenarios } from './scenarios.mjs';

const root = path.join(import.meta.dirname, '..');
const BASE = 'https://playpokergym.com';
const UPDATED = '2026-11-04';

const CORE = [
  ['/', 1.0], ['/web/', 0.9], ['/guides/', 0.8], ['/web/privacy', 0.3],
];
const LONG_GUIDES = [
  '/guides/blackjack/', '/guides/jacks-or-better/', '/guides/baccarat/',
  '/guides/holdem-best-five/', '/guides/weekly-01/',
];

function sitemap() {
  const rows = [
    ...CORE.map(([url, priority]) => `  <url><loc>${BASE}${url}</loc><lastmod>${UPDATED}</lastmod><priority>${priority}</priority></url>`),
    ...LONG_GUIDES.map(url => `  <url><loc>${BASE}${url}</loc><lastmod>${UPDATED}</lastmod><priority>0.8</priority></url>`),
    ...scenarios.map(s => `  <url><loc>${BASE}/guides/${s.slug}/</loc><lastmod>${UPDATED}</lastmod><priority>0.7</priority></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

const group = slug =>
  slug.startsWith('blackjack-') ? 'Blackjack'
  : slug.startsWith('video-poker-') ? 'Video poker'
  : slug.startsWith('baccarat-') ? 'Baccarat'
  : slug.startsWith('holdem-') ? "Hold'em"
  : 'Free trainers';

// llms.txt has to stay under 10 KB (test/release/seo.test.js enforces it) while the
// guide list keeps growing. Rather than let the file drift over the limit and then
// hand-trim prose, budget the answer snippets: keep each to its first sentence, then
// shrink the cap until the whole file fits. llms-full.txt keeps every answer in full.
const LLMS_BUDGET = 9600;
const GROUPS = ['Blackjack', 'Video poker', 'Baccarat', "Hold'em", 'Free trainers'];

// Trim at a word boundary so a shortened snippet still reads cleanly.
function clip(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:]$/, '')}\u2026`;
}

// Per-guide snippet, capped independently (Infinity = keep the first sentence).
function llmsList(caps = new Map()) {
  const sections = GROUPS.map(name => {
    const rows = scenarios.filter(s => group(s.slug) === name);
    return `### ${name}\n\n${rows.map(s => `- [${s.title}](${BASE}/guides/${s.slug}/): ${clip(s.answer.split(/(?<=\.) /)[0], caps.get(s.slug) ?? Infinity)}`).join('\n')}`;
  });
  return sections.join('\n\n');
}

function replaceSection(text, startMarker, endMarker, replacement) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`section ${startMarker} not found`);
  return text.slice(0, start) + replacement + text.slice(end);
}

// llms.txt: replace the old one-question block, keep everything around it.
const llmsPath = path.join(root, 'public', 'llms.txt');
let llms = readFileSync(llmsPath, 'utf8');
const listStart = llms.indexOf('## One-question guides');
if (listStart < 0) throw new Error('llms.txt section missing');
const listEnd = llms.indexOf('## Optional', listStart);
if (listEnd < 0) throw new Error('llms.txt end marker missing');
const head = llms.slice(0, listStart);
const tail = llms.slice(listEnd);
const intro = '## One-question guides\n\nEach page answers in the first sentence and links to the exact drill, so you can\nquote the answer and the practice link together.\n\n';
// Widen the snippets as far as the budget allows, so shortening only kicks in
// once the guide list has genuinely outgrown the file.
// Only shorten the wordiest answers, longest first, until the file fits. The
// short, high-value answers keep their exact wording.
const caps = new Map();
const sizes = () => head.length + intro.length + llmsList(caps).length + tail.length;
const firstSentence = s => s.answer.split(/(?<=\.) /)[0];
const longestFirst = [...scenarios].sort((a, b) => firstSentence(b).length - firstSentence(a).length);
for (const s of longestFirst) {
  if (sizes() <= LLMS_BUDGET) break;
  const full = firstSentence(s).length;
  for (let cap = Math.min(full, 140); cap >= 30; cap -= 10) {
    caps.set(s.slug, cap);
    if (sizes() <= LLMS_BUDGET) break;
  }
}
const list = llmsList(caps);
llms = head + intro + list + '\n\n' + tail;
llms = llms.replace(/Last updated: \d{4}-\d{2}-\d{2}\./, `Last updated: ${UPDATED}.`);
writeFileSync(llmsPath, llms);

// llms-full.txt: same set, with the drill URL next to each answer.
const fullPath = path.join(root, 'public', 'llms-full.txt');
let full = readFileSync(fullPath, 'utf8');
const fullSection = `## One-question guides\n\nEvery entry below has a page with the answer, the reasoning and a drill link.\n\n${scenarios.map(s =>
  `### ${s.title}\n${s.answer}\nWhy: ${s.why[0]}\nPage: ${BASE}/guides/${s.slug}/\nPractice: ${BASE}${s.cta[1]}`).join('\n\n')}\n\n`;
if (full.includes('## One-question guides')) {
  full = replaceSection(full, '## One-question guides', '## Contact', fullSection);
} else {
  full = full.replace('## Contact', fullSection + '## Contact');
}
writeFileSync(fullPath, full);

writeFileSync(path.join(root, 'public', 'sitemap.xml'), sitemap());
console.log(`sitemap ${CORE.length + LONG_GUIDES.length + scenarios.length} urls, llms ${scenarios.length} guides`);
