// Runs node --test on an explicit file list so it works on Node 20 (no glob
// support in --test) as well as 22+. Fails loudly if no test files are found
// or if the runner reports zero tests.
import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const dir = process.argv[2] ?? 'test';
const recursive = process.argv.includes('--recursive');

function collect(d) {
  const out = [];
  for (const name of readdirSync(d).sort()) {
    const p = path.join(d, name);
    if (statSync(p).isDirectory()) { if (recursive) out.push(...collect(p)); }
    else if (name.endsWith('.test.js')) out.push(p);
  }
  return out;
}

const files = collect(dir);
if (files.length === 0) {
  console.error(`run-tests: no *.test.js files found in ${dir}/ — refusing to report success.`);
  process.exit(1);
}
const r = spawnSync(process.execPath, ['--test', ...files], { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] });
process.stdout.write(r.stdout ?? '');
const m = /^# tests (\d+)/m.exec(r.stdout ?? '');
if (!m || Number(m[1]) === 0) {
  console.error('run-tests: the runner reported zero tests — failing.');
  process.exit(1);
}
process.exit(r.status ?? 1);
