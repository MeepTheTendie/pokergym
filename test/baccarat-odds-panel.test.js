import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function loadPanelFns() {
  const src = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
  const start = src.indexOf('function payRow(label, amt, on)');
  const mid = src.indexOf('\nfunction renderPaytable()', start);
  const end = src.indexOf('\nfunction setControls()', mid);
  assert.ok(start !== -1 && mid !== -1 && end !== -1, 'could not extract paytable functions from web/app.js');
  return src.slice(start, end);
}

function makeDoc() {
  const elements = new Map();
  const mk = (id) => ({
    id,
    textContent: '',
    children: [],
    replaceChildren(...nodes) { this.children = nodes; },
  });
  return {
    elements,
    createElement() {
      return { className: '', textContent: '', children: [], append(...nodes) { this.children.push(...nodes); } };
    },
    el(id) {
      if (!elements.has(id)) elements.set(id, mk(id));
      return elements.get(id);
    },
  };
}

test('baccarat Odds panel does not mark a winning row before a side is chosen', () => {
  const code = loadPanelFns();
  const doc = makeDoc();
  const bacBest = () => ({
    side: 'banker',
    probabilities: { banker: 0.458597, player: 0.446247, tie: 0.095156 },
    alternatives: [
      { side: 'banker', ev: -0.0106 },
      { side: 'player', ev: -0.0124 },
      { side: 'tie', ev: -0.1436 },
    ],
  });
  const run = (handDone) => {
    const scope = {
      document: { createElement: (...a) => doc.createElement(...a) },
      el: (id) => doc.el(id),
      gameId: 'baccarat',
      handDone,
      bacBest,
    };
    const fn = new Function('document', 'el', 'gameId', 'handDone', 'bacBest', `${code}; return renderPaytable;`);
    fn(scope.document, scope.el, scope.gameId, scope.handDone, scope.bacBest)();
    return doc.el('paytable').children;
  };

  const before = run(false);
  assert.equal(before.length, 3);
  assert.ok(before.every((row) => row.className !== 'won'), 'no won row before a side is chosen');
  assert.ok(before.every((row) => !String(row.children[0]?.textContent || '').startsWith('> ')), 'no marker before a side is chosen');

  const after = run(true);
  assert.ok(after.some((row) => row.className === 'won'), 'best side marked after hand is done');
});
