import { evaluate, evaluate5, compareStrength } from '../evaluate.js';

export function clearCache() {}

/*
 * Grades a player's pick of five cards out of the seven they can see.
 *
 * The test is strength, not identity: several five-card subsets can tie for the
 * best hand (a board that plays on its own is the obvious case, and any
 * equivalent kicker lands in the same bucket), so requiring the exact subset the
 * evaluator happened to reach first would mark a correct read as wrong.
 *
 * Membership is matched on rank and suit rather than object identity, so a pick
 * built from re-read or cloned cards still grades the same way the pick on
 * screen does.
 */
export function playsBestFive(hand7, chosen) {
  if (!Array.isArray(hand7) || hand7.length < 5) return false;
  if (!Array.isArray(chosen) || chosen.length !== 5) return false;
  if ([...hand7, ...chosen].some((card) => !card || typeof card.r !== 'number' || typeof card.s !== 'number')) {
    return false;
  }
  const key = (card) => `${card.r}:${card.s}`;
  const pool = new Set(hand7.map(key));
  const picks = chosen.map(key);
  if (new Set(picks).size !== 5) return false;
  if (!picks.every((k) => pool.has(k))) return false;
  const best = evaluate(hand7);
  if (!best) return false;
  const picked = evaluate5(chosen);
  return compareStrength(picked.strength, best.strength) === 0;
}
