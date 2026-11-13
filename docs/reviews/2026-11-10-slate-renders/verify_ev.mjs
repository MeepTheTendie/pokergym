import { roundWith, bestAction, clearCache } from '/home/claude/pokergym/test/blackjack-helpers.mjs';
for (const [h, up] of [[[6,3],3],[[14,7],9],[[9,9],7]]) {
  clearCache();
  const r = bestAction(roundWith(h, up));
  console.log(JSON.stringify(h), 'vs', up, 'best', r.action, r.alternatives.map(o => `${o.action} ${o.ev.toFixed(6)}`).join(', '));
}
