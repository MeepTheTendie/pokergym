// Pure helpers for shareable links and entry URL params. No DOM, no storage,
// no network: node --test imports this directly, and web/app.js uses it.
//
// PUBLISHED_REFS is the single source of truth for attribution refs. The P5
// visit counter imports this list and classifyRef(); to publish a new ref,
// edit this list (and its tests) — never add a second rule elsewhere.

export const SITE_ORIGIN = 'https://playpokergym.com';
export const APP_URL = `${SITE_ORIGIN}/web/`;

// Player-to-player shares, then the channels the marketing plan publishes to
// (see the tagging convention in MARKETING.md), then older entry points.
export const PUBLISHED_REFS = Object.freeze([
  'share', 'invite',
  'youtube', 'tiktok', 'reels', 'x',
  'reddit', 'playmygame', 'webgames',
  'sideproject', 'hn', 'videopoker',
  'instagram', 'facebook',
]);

// Host -> ref fallback for visitors who arrive without a ?ref= tag. Keys are
// lowercased hostnames (no leading www.). Kept here as the single source of
// truth; web/posthog-loader.js mirrors a small table of the same values.
export const REFERRER_REFS = Object.freeze({
  'instagram.com': 'instagram',
  'l.instagram.com': 'instagram',
  'facebook.com': 'facebook',
  'l.facebook.com': 'facebook',
  'm.facebook.com': 'facebook',
  'lm.facebook.com': 'facebook',
  'x.com': 'x',
  't.co': 'x',
  'twitter.com': 'x',
  'youtube.com': 'youtube',
  'm.youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'tiktok.com': 'tiktok',
  'reddit.com': 'reddit',
  'www.reddit.com': 'reddit',
  'out.reddit.com': 'reddit',
});

// Infer a published ref from a document.referrer value. Returns null when the
// referrer is missing, invalid, or not a recognised host.
export function refFromReferrer(href) {
  if (href === null || href === undefined) return null;
  const text = String(href).trim();
  if (text === '') return null;
  let host;
  try { host = new URL(text).hostname.toLowerCase(); } catch { return null; }
  if (!host) return null;
  if (host.startsWith('www.')) host = host.slice(4);
  // Exact match first, then subdomain suffix.
  if (Object.prototype.hasOwnProperty.call(REFERRER_REFS, host)) return REFERRER_REFS[host];
  for (const key of Object.keys(REFERRER_REFS)) {
    const bare = key.startsWith('www.') ? key.slice(4) : key;
    if (host === bare || host.endsWith('.' + bare)) return REFERRER_REFS[key];
  }
  return null;
}

// A ref in the list maps to itself; missing/blank maps to 'none'; everything
// else (case variants, junk, prototype keys) maps to 'other'.
export function classifyRef(value) {
  if (value === undefined || value === null) return 'none';
  const text = String(value);
  if (text.trim() === '') return 'none';
  return PUBLISHED_REFS.includes(text) ? text : 'other';
}

// Landing-page entry: ?daily=1 promotes today's Daily Drill on the title screen.
export const DAILY_ENTRY_URL = '/web/?daily=1';

// The daily-result link: attributable (ref=share) and deep-linked (d=number).
export function shareUrl(number) {
  return `${APP_URL}?ref=share&d=${number}`;
}

export function inviteUrl() {
  return `${APP_URL}?ref=invite`;
}

// Builds the copyable Daily Drill result. Format is unchanged apart from the URL.
export function buildDailyShareText({ number, results, total, games }) {
  const tally = results.filter(v => v).length;
  return `Poker Gym Daily #${number}  ${tally}/${total}\n${results.map(ok => ok ? '🟩' : '🟥').join('')}\n🃏 ${games.join(' · ')}\n${shareUrl(number)}`;
}

// A daily number is a positive safe integer written as plain digits.
function parseDay(raw) {
  if (raw === null || raw === undefined || !/^\d{1,6}$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
}

// parseEntryParams('?ref=share&d=42&practice=blackjack')
//   -> { ref: 'share', day: 42, practice: 'blackjack' }
// Repeated params use the first value (URLSearchParams.get).
export function parseEntryParams(search) {
  const params = new URLSearchParams(search ?? '');
  return {
    ref: classifyRef(params.get('ref')),
    day: parseDay(params.get('d')),
    practice: params.get('practice') || null,
    daily: params.get('daily') === '1',
  };
}

// ±1 tolerance: dailyKey() is the player's local date, so a viewer across a
// date line from the sharer may be one number ahead or behind.
export function isSharedDayCurrent(sharedDay, todayNumber) {
  return Number.isInteger(sharedDay) && Math.abs(sharedDay - todayNumber) <= 1;
}

// The address to show after ref/d are read: drop them, keep everything else
// (notably ?practice=) and the hash.
export function cleanEntrySearch(search) {
  const params = new URLSearchParams(search ?? '');
  params.delete('ref');
  params.delete('d');
  params.delete('daily');
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
