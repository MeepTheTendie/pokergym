// Submit every sitemap URL to IndexNow (Bing, Yandex and the partners that
// share the endpoint). Google does not use IndexNow; Search Console is still
// the only way to tell Google directly.
//
// The key file must already be live at /<key>.txt:
//   public/<key>.txt  ->  https://playpokergym.com/<key>.txt
//
//   node scripts/indexnow.mjs [--dry]
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const HOST = 'playpokergym.com';

const xml = readFileSync(path.join(root, 'public', 'sitemap.xml'), 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (!urls.length) {
  console.error('no URLs in sitemap');
  process.exit(1);
}

const key = readFileSync(path.join(root, 'scripts', 'indexnow-key.txt'), 'utf8').trim();
if (!/^[0-9a-f]{32}$/.test(key)) {
  console.error('indexnow-key.txt must hold the 32-character hexadecimal key');
  process.exit(1);
}

const payload = {
  host: HOST,
  key,
  keyLocation: `https://${HOST}/${key}.txt`,
  urlList: urls,
};

if (process.argv.includes('--dry')) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});
console.log(`IndexNow ${response.status} for ${urls.length} URLs`);
if (!response.ok) {
  console.error((await response.text()).slice(0, 400));
  process.exit(1);
}
