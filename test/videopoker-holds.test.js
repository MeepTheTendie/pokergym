import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suitIndex } from '../src/cards.js';
import { bestHold, clearCache } from '../src/coach/videopoker.js';

// Hold advice for the non-Jacks variants. Expected holds come from published
// expert strategy for each pay table (8/5 Bonus, 9/6 Double Double Bonus,
// full-pay Deuces Wild), never from the solver. A test passes when the
// expected hold is among the coach's optimal (tied-best) holds. A mismatch is
// a possible coach bug: do not edit the expectation to match the code.
const c = (txt) => {
  const rank = { T: 10, J: 11, Q: 12, K: 13, A: 14 }[txt[0]] ?? Number(txt[0]);
  return { r: rank, s: suitIndex(txt[1]) };
};
// "Ks Qs Js Ts 3s" with held cards marked by a leading '*'.
function parse(spec) {
  const parts = spec.split(' ');
  return { hand: parts.map((p) => c(p.replace('*', ''))), hold: parts.map((p) => p.startsWith('*')) };
}

const CASES = {
  'bonus-poker': [
    ['*Ks *Qs *Js *Ts 3s', '4 to a royal beats a made flush'],
    ['*6h 6c *2h *9h *Kh', '4 to a flush beats a low pair'],
    ['*Jh *Jc 3h 7h 9h', 'a high pair beats 4 to a flush'],
    ['*9s *9d *4c *4h Kd', 'two pair holds both pairs'],
    ['*8c *8d *8h Ks 2d', 'three of a kind holds the trips'],
    ['*5c *6d *7h *8s Kd', 'an open-ended straight draw beats one high card'],
    ['*Ac *Ad 7s 4h 9c', 'a pair of aces holds the pair'],
    ['*9s *9d *9c *5s *5d', 'a dealt full house is kept'],
  ],
  'double-double-bonus': [
    ['*Ac *Ad *As *Ah *3c', 'four aces with a 2-4 kicker keeps the kicker'],
    ['*Ac *Ad *As *Ah Kc', 'four aces without a kicker draws for one'],
    ['*Kh *Kc 3h 7h 9h', 'a high pair beats 4 to a flush'],
    ['*7c *7d *7h Ks 2d', 'three of a kind holds the trips'],
    ['*Ks *Qs *Js *Ts 3s', '4 to a royal beats a made flush'],
    ['*5h *6h *7h *8h *9h', 'a dealt straight flush is kept'],
    ['*9s *9d *9c *5s *5d', 'a dealt full house of nines is kept'],
  ],
  'deuces-wild': [
    ['*2c *2d 5h 9s Kc', 'two deuces with nothing holds just the deuces'],
    ['*2c *2d *2h 7s Kc', 'three deuces hold just the deuces'],
    ['*7c *7d 3h 9s Kc', 'no deuce: a pair is held'],
    ['*Ks *Qs *Js *Ts 3c', 'no deuce: 4 to a natural royal'],
    ['*As *Ks *Qs *Js *Ts', 'a natural royal is kept'],
    ['*2c *Ks *Qs *Js *Ts', 'a made wild royal is kept'],
    ['*8c *8d *8h Ks 3d', 'no deuce: trips hold the trips'],
    ['*9s *9d *9c *5s *5d', 'a dealt full house is kept'],
  ],
};

for (const [variant, cases] of Object.entries(CASES)) {
  test(`${variant}: coach holds match published strategy`, () => {
    const wrong = [];
    for (const [spec, why] of cases) {
      clearCache();
      const { hand, hold } = parse(spec);
      const r = bestHold(hand, { variant });
      const ok = r.optimal.some((h) => h.every((x, i) => x === hold[i]));
      if (!ok) wrong.push(`${spec} (${why}): coach holds ${hand.filter((_, i) => r.holds[i]).map((x) => x.r).join(',') || 'nothing'}`);
    }
    assert.deepEqual(wrong, []);
  });
}

test('deuces-wild: two pair with no deuce keeps only one pair', () => {
  clearCache();
  const { hand } = parse('9c 9d 5h 5s Kc');
  const r = bestHold(hand, { variant: 'deuces-wild' });
  for (const h of r.optimal) {
    const kept = hand.filter((_, i) => h[i]);
    assert.equal(kept.length, 2, 'one pair only');
    assert.equal(kept[0].r, kept[1].r);
  }
});

// Regression (fixed Oct 27, 2026): DDB_PAY paid two pair 2; published 9/6 DDB
// pays 1. With the correct table, aces up holds only the aces (independent
// brute force: AA 1.931 vs two pair 1.681 per coin).
test('double-double-bonus: aces up holds only the aces', () => {
  clearCache();
  const { hand, hold } = parse('*Ac *Ad 8s 8h Kc');
  const r = bestHold(hand, { variant: 'double-double-bonus' });
  assert.ok(r.optimal.some((h) => h.every((x, i) => x === hold[i])));
});

test('double-double-bonus pays two pair 1 (9/6 DDB), Bonus and Jacks pay 2', async () => {
  const { variantById, WIN } = await import('../src/games/videopoker.js');
  assert.equal(variantById('double-double-bonus').pay[WIN.TWO_PAIR], 1);
  assert.equal(variantById('bonus-poker').pay[WIN.TWO_PAIR], 2);
  assert.equal(variantById('jacks-or-better').pay[WIN.TWO_PAIR], 2);
});
