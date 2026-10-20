import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');

test('open_trainer is fired before any game_start for a fresh visitor', () => {
  const openIdx = src.indexOf('analytics.openTrainer(');
  const ifIdx = src.indexOf('if (profile) { renderMap(); show(\'scr-map\'); }');
  assert.ok(openIdx > -1 && ifIdx > -1, 'expected markers present');
  assert.ok(openIdx < ifIdx, 'openTrainer must precede the profile/start block');
});
