export const STATS = {
  FOCUS: 'focus',
  NERVE: 'nerve',
  READ: 'read',
};

export const STAT_LABEL = {
  focus: 'Focus',
  nerve: 'Nerve',
  read: 'Read',
};

export const CLASSES = [
  {
    id: 'scholar',
    name: 'SCHOLAR',
    game: 'videopoker',
    gym: 'pokergym',
    blurb: 'You count suits and rank hands without thinking about it.',
    accent: '#7aa2f7',
    biases: { [STATS.FOCUS]: 3, [STATS.READ]: 1, [STATS.NERVE]: 0 },
    growth: { [STATS.FOCUS]: 1.4, [STATS.READ]: 1.1, [STATS.NERVE]: 0.8 },
    perk: 'Correct plays pay 40% more XP.',
  },
  {
    id: 'dealer',
    name: 'DEALER',
    game: 'blackjack',
    gym: 'countyfair',
    blurb: 'You watch the shoe instead of the cards in your hand.',
    accent: '#f8a24b',
    biases: { [STATS.NERVE]: 3, [STATS.FOCUS]: 1, [STATS.READ]: 0 },
    growth: { [STATS.FOCUS]: 0.8, [STATS.READ]: 1.0, [STATS.NERVE]: 1.5 },
    perk: 'Correct plays pay 40% more XP.',
  },
  {
    id: 'countess',
    name: 'COUNTESS',
    game: 'baccarat',
    gym: 'villaoak',
    blurb: 'You read the room before anyone else does.',
    accent: '#c792ea',
    biases: { [STATS.READ]: 3, [STATS.NERVE]: 1, [STATS.FOCUS]: 0 },
    growth: { [STATS.FOCUS]: 1.0, [STATS.READ]: 1.4, [STATS.NERVE]: 1.0 },
    perk: 'Correct plays pay 40% more XP.',
  },
  {
    id: 'grinder',
    name: 'GRINDER',
    game: 'holdem',
    gym: 'riverstone',
    blurb: 'You do not need to feel lucky. You need to be right.',
    accent: '#6ee7b7',
    biases: { [STATS.FOCUS]: 2, [STATS.NERVE]: 1, [STATS.READ]: 1 },
    growth: { [STATS.FOCUS]: 1.3, [STATS.READ]: 1.2, [STATS.NERVE]: 1.0 },
    perk: 'Correct plays pay 40% more XP.',
  },
];

export const CLASS_BY_ID = Object.fromEntries(CLASSES.map((c) => [c.id, c]));

export function startingStats(classId) {
  const cls = CLASS_BY_ID[classId];
  if (!cls) throw new Error(`unknown trainer class: ${classId}`);
  const base = { focus: 1, nerve: 1, read: 1 };
  for (const key of Object.keys(base)) base[key] += cls.biases[key] ?? 0;
  return base;
}