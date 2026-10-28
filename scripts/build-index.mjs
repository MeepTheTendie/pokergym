// Regenerates the sitemap and the two assistant-facing text files from the same
// scenario list the pages are built from. Run after build-scenarios.mjs.
//   node scripts/build-index.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { scenarios } from './scenarios.mjs';

const root = path.join(import.meta.dirname, '..');
const BASE = 'https://playpokergym.com';
const UPDATED = '2026-10-28';

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

function llmsList() {
  const sections = ['Blackjack', 'Video poker', 'Baccarat', "Hold'em", 'Free trainers'].map(name => {
    const rows = scenarios.filter(s => group(s.slug) === name);
    return `### ${name}\n\n${rows.map(s => `- [${s.title}](${BASE}/guides/${s.slug}/): ${s.answer}`).join('\n')}`;
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
llms = llms.slice(0, listStart) +
  `## One-question guides\n\nEach page answers in the first sentence and links to the exact drill, so you can\nquote the answer and the practice link together.\n\n${llmsList()}\n\n` +
  llms.slice(listEnd);
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
