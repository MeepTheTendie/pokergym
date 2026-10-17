import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from './build.mjs';
import { GUIDES, localLinks } from './portable-links.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const staging = await mkdtemp(path.join(tmpdir(), 'pokergym-itch-'));
try {
  await build(staging);
  // Ship the complete recall-to-practice routine without requiring the cloud host.
  await rm(path.join(staging, 'guides'), { recursive: true, force: true });
  await rm(path.join(staging, 'sitemap.xml'), { force: true });
  const guides = GUIDES;
  for (const guide of guides) {
    const html = await readFile(path.join(root, `public/guides/${guide}/index.html`), 'utf8');
    await writeFile(path.join(staging, `web/guide-${guide}.html`), localLinks(html));
  }
  const sample = await readFile(path.join(root, 'public/guides/weekly-01/index.html'), 'utf8');
  const portableSample = localLinks(sample)
    .replace(/<link rel="manifest"[^>]+>/, '')
    .replace(/<p><button id="pack-download"[\s\S]*?<section aria-label="Pack score">/, '<p class="note">This sample is included in the download. Serve the extracted folder in a browser to practice without contacting Poker Gym. Feedback links need a connection. Scores stay on this host, separately from the live site.</p><section aria-label="Pack score">')
    .replace(/href="\/web\/\?practice=blackjack"/g, 'href="index.html?practice=blackjack"')
    .replace(/href="\/web\/privacy"/g, 'href="privacy.html"')
    .replace(/href="\/web\/icon.svg"/g, 'href="icon.svg"')
    .replace(/href="(\/[^"\s]*)"/g, 'href="https://playpokergym.com$1"')
    .replace(/<script src="\/guides\/weekly-01\/offline.js[^<]*<\/script>/, '')
    .replace(/\/guides\/weekly-01\/score.js(?:\?v=[0-9]+)?/g, 'weekly-score.js');
  await writeFile(path.join(staging, 'web/weekly-sample.html'), portableSample);
  await writeFile(path.join(staging, 'web/weekly-score.js'),
    await readFile(path.join(root, 'public/guides/weekly-01/score.js')));
  const game = await readFile(path.join(staging, 'web/index.html'), 'utf8');
  const portableGame = game.replace('<p class="hint" id="offlineStatus"',
    '<p class="hint" style="text-align:center;"><a id="portableWeeklySample" href="weekly-sample.html" target="_blank" rel="noopener">TRY THE FIVE-DECISION WEEKLY SAMPLE</a></p><details id="portableGuides"><summary>THREE-DECISION LEARNING GUIDES</summary>' + guides.map(guide => `<p><a href="guide-${guide}.html" target="_blank" rel="noopener">${{blackjack: 'Blackjack', baccarat: 'Baccarat', 'jacks-or-better': 'Jacks or Better', 'holdem-best-five': 'Hold’em best five'}[guide]}</a></p>`).join('') + '</details><p class="hint" id="offlineStatus"');
  await writeFile(path.join(staging, 'web/index.html'), portableGame.replace('<link rel="manifest" href="manifest.webmanifest">', ''));
  // Keep module-relative assets intact; the entry point must be at the ZIP root.
  // An embedded demo should not advertise installation of the cloud PWA.
  await writeFile(path.join(staging, 'index.html'), portableGame
    .replace('<link rel="manifest" href="manifest.webmanifest">', '<base href="./web/">'));
  await mkdir(path.join(root, 'artifacts'), { recursive: true });
  // zipfile overwrites the archive rather than keeping removed files from old builds.
  execFileSync('python3', ['-c', `import pathlib, sys, zipfile
root = pathlib.Path(sys.argv[1])
with zipfile.ZipFile(sys.argv[2], 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(root.rglob('*')):
        if file.is_file():
            archive.write(file, file.relative_to(root).as_posix())
`, staging, path.join(root, 'artifacts/pokergym-itch.zip')]);
  console.log('Built artifacts/pokergym-itch.zip (free browser demo; no checkout).');
} finally {
  await rm(staging, { recursive: true, force: true });
}
