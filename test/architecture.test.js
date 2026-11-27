// Guards the stable direction of the product's core modules without adding
// a runtime dependency or forcing cosmetic directory moves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const srcRoot = fileURLToPath(new URL('../src/', import.meta.url));

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.isFile() && entry.name.endsWith('.js') ? [full] : [];
  }).sort();
}

// Covers static ESM imports and re-exports, including multiline named imports.
// No external parser package is required in the Node 20+ test toolchain.
function relativeImports(source) {
  const pattern = /(?:^|\n)\s*(?:import|export)\s+(?:(?:\{[^}]*\}|[\w$*{},\s]+)\s+from\s+)?['"](\.[^'"]+)['"]/g;
  return [...source.matchAll(pattern)].map(match => match[1]);
}

test('core modules have one-way boundaries and no circular imports', () => {
  const files = sourceFiles(srcRoot);
  assert.ok(files.length >= 20, 'expected the full core module tree');
  const known = new Set(files);
  const edges = new Map();

  for (const file of files) {
    const imports = relativeImports(readFileSync(file, 'utf8'));
    const targets = imports.map(specifier => {
      const target = path.resolve(path.dirname(file), specifier.split('?')[0]);
      assert.ok(
        target.startsWith(srcRoot + path.sep),
        path.relative(srcRoot, file) + ' must not import outside src/: ' + specifier,
      );
      assert.ok(
        known.has(target),
        path.relative(srcRoot, file) + ' imports missing core module: ' + specifier,
      );
      return target;
    });
    edges.set(file, targets);
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(file, stack) {
    assert.ok(
      !visiting.has(file),
      'circular core dependency: ' + [...stack, file].map(f => path.relative(srcRoot, f)).join(' -> '),
    );
    if (visited.has(file)) return;
    visiting.add(file);
    for (const dep of edges.get(file)) visit(dep, [...stack, file]);
    visiting.delete(file);
    visited.add(file);
  }
  for (const file of files) visit(file, []);
});
