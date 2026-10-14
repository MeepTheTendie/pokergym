// Pure counting rules for the visit counter (worker/index.js). Node-testable.
// The ref whitelist is NOT defined here: it is PUBLISHED_REFS / classifyRef()
// from src/rpg/links.js, shared with the app's share links.
import { classifyRef } from '../src/rpg/links.js';

// Explicit published pages only; variants share a canonical bucket.
// Arbitrary URLs and query values must never become analytics dimensions.
const PATH_BUCKETS = new Map([
  ['/', '/'],
  ['/web/', '/web/'],
  ['/web', '/web/'],
  ['/web/index.html', '/web/'],
]);
export const GUIDE_PATHS = Object.freeze([
  '/guides/jacks-or-better/',
  '/guides/blackjack/',
  '/guides/baccarat/',
  '/guides/holdem-best-five/',
  '/guides/weekly-01/',
]);
for (const path of GUIDE_PATHS) {
  PATH_BUCKETS.set(path, path);
  PATH_BUCKETS.set(path.slice(0, -1), path);
  PATH_BUCKETS.set(`${path}index.html`, path);
}

export function pathBucket(pathname) {
  return PATH_BUCKETS.get(pathname) ?? null;
}

// Page-like = a top-level navigation or an HTML request. Asset fetches,
// service-worker cache fills and module imports are never counted.
export function isPageLike(headers) {
  const mode = headers.get('sec-fetch-mode');
  if (mode) return mode === 'navigate';
  return (headers.get('accept') ?? '').includes('text/html');
}

// -> null (do not count) or { path, ref }. Reads only method, URL and two
// request headers; no IP, user agent or cookie is ever looked at.
export function countBucket(request) {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  const path = pathBucket(url.pathname);
  if (!path || !isPageLike(request.headers)) return null;
  return { path, ref: classifyRef(url.searchParams.get('ref')) };
}

export const DATASET = 'pokergym_visits';

// One Analytics Engine data point per counted request. The date comes from
// the data point's own timestamp (UTC); nothing identifying is written.
export function dataPoint({ path, ref }) {
  return { indexes: ['v1'], blobs: [path, ref], doubles: [1] };
}
