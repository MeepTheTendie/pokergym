import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from './build.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const staging = await mkdtemp(path.join(tmpdir(), 'pokergym-itch-'));
try {
  await build(staging);
  // The public learning guide belongs to the cloud site, not the embedded game.
  await rm(path.join(staging, 'guides'), { recursive: true, force: true });
  const game = await readFile(path.join(staging, 'web/index.html'), 'utf8');
  // Keep module-relative assets intact; the entry point must be at the ZIP root.
  // An embedded demo should not advertise installation of the cloud PWA.
  await writeFile(path.join(staging, 'index.html'), game
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
