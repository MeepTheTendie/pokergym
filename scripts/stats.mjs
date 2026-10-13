// npm run stats — last 30 days of page-like requests from the visit counter.
// Reads Workers Analytics Engine through its SQL API (wrangler has no read
// command for AE, and wrangler login's OAuth cannot call it).
//
// One-time setup (see README "Visit stats"):
//   1. Cloudflare dashboard → My Profile → API Tokens → Create Token → Custom:
//      permission Account · Account Analytics · Read, for this account only.
//   2. Store it in the desktop keyring (never in the repo):
//        secret-tool store --label='Cloudflare Analytics (pokergym stats)' service cloudflare-analytics account pokergym
//   Or export CLOUDFLARE_API_TOKEN for a single run. The token is never printed.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const DATASET = 'pokergym_visits';

export function buildQuery(days = 30) {
  return `SELECT toDate(timestamp) AS day, blob1 AS path, blob2 AS ref, SUM(_sample_interval) AS count
FROM ${DATASET}
WHERE timestamp > NOW() - INTERVAL '${Number(days)}' DAY
GROUP BY day, path, ref
ORDER BY day DESC, path, count DESC
FORMAT JSON`;
}

export function formatTable(rows) {
  const lines = ['Poker Gym visit counter — page-like requests, not people.',
    'Unfurl bots (X, Discord, …) and crawlers are included; dates are UTC.', ''];
  const head = ['date', 'path', 'ref', 'count'];
  const body = rows.map(r => [String(r.day), String(r.path), String(r.ref), String(Math.round(Number(r.count)))]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map(b => b[i].length)));
  const fmt = cells => cells.map((c, i) => (i === 3 ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join('  ');
  lines.push(fmt(head), widths.map(w => '-'.repeat(w)).join('  '), ...body.map(fmt));
  if (!body.length) lines.push('(no counted requests in the last 30 days)');
  return lines.join('\n');
}

function token() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN.trim();
  try {
    return execFileSync('secret-tool', ['lookup', 'service', 'cloudflare-analytics', 'account', 'pokergym'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function accountId() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
  for (const file of ['.wrangler/cache/wrangler-account.json', 'node_modules/.cache/wrangler/wrangler-account.json']) {
    try { const id = JSON.parse(readFileSync(path.join(root, file), 'utf8')).account?.id; if (id) return id; } catch {}
  }
  return '';
}

async function main() {
  const tok = token();
  const account = accountId();
  if (!tok) throw new Error('No API token. Set CLOUDFLARE_API_TOKEN or run the one-time secret-tool store command in scripts/stats.mjs.');
  if (!account) throw new Error('No account id. Set CLOUDFLARE_ACCOUNT_ID, or run any wrangler command once so .wrangler/cache/wrangler-account.json exists.');
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`, {
    method: 'POST', headers: { authorization: `Bearer ${tok}` }, body: buildQuery(30),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Analytics Engine SQL API returned ${res.status}: ${text.slice(0, 300)}`);
  console.log(formatTable(JSON.parse(text).data ?? []));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exit(1); });
}
