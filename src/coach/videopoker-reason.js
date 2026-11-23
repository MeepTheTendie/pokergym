// Why the coach likes a video-poker hold. Pure so a browser hand and a unit
// test read the same words. The order matters: a 3-card royal (10-J-Q-K-A,
// suited) is a royal draw, not a plain flush draw, and a suited run is a
// straight-flush draw before it is a flush draw.
export function reasonFor(kept, variant) {
  const pairPays = (variant?.minPairRank ?? 11) <= 14;
  const counts = {};
  for (const c of kept) counts[c.r] = (counts[c.r] ?? 0) + 1;
  const groups = Object.values(counts).sort((a, b) => b - a);
  const pairs = groups.filter((n) => n === 2).length;
  if (groups.includes(4)) return 'Four of a kind already pays, so keep all five cards.';
  if (groups.includes(3)) return 'Three of a kind. Keep the trips and draw two.';
  if (!pairPays && pairs > 0) return 'That pair does not pay, but it is still the best draw.';
  if (pairs === 2) return 'Two pair. Keep both pairs for four shots at a full house.';
  if (pairs === 1) {
    const r = Number(Object.keys(counts).find((k) => counts[k] === 2));
    return r >= 11
      ? 'Jacks or better pays, so build on the pair.'
      : 'The pair is below jacks, so it pays nothing. It is still the best hold.';
  }

  if (kept.length >= 3 && new Set(kept.map((c) => c.s)).size === 1) {
    const ranks = kept.map((c) => c.r);
    const made = kept.length === 5;
    if (ranks.every((r) => r >= 10)) {
      return made ? 'That is a royal flush. Keep all five cards.' : `${kept.length} cards to a royal flush.`;
    }
    if (isSuitedRun(ranks)) {
      return made ? 'That is a straight flush. Keep all five cards.' : `${kept.length} cards to a straight flush.`;
    }
    return made ? 'That is a flush. Keep all five cards.' : `${kept.length} cards to a flush.`;
  }

  if (kept.length === 5) return 'This hand already pays, so keep all five cards.';
  if (kept.length === 4) return 'Four cards to an outside straight draw, with eight outs.';
  return 'This is the best chance of a paying hand from these cards.';
}

// Consecutive ranks with no pair, allowing the ace to play low (A-2-3).
function isSuitedRun(ranks) {
  const unique = [...new Set(ranks)].sort((a, b) => a - b);
  if (unique.length !== ranks.length) return false;
  const run = (values) => values.every((r, i) => i === 0 || r === values[i - 1] + 1);
  if (run(unique)) return true;
  if (!unique.includes(14)) return false;
  return run([1, ...unique.filter((r) => r !== 14)]);
}
