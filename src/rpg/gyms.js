import { CLASS_BY_ID } from './classes.js';

export const GYMS = [
  {
    id: 'pokergym',
    name: 'POKER GYM',
    game: 'videopoker',
    leader: 'MASTER ROYALE',
    leaderTitle: 'POKER MASTER',
    quote: 'Five cards. No bluffing. Just the maths.',
    badge: 'JACKS BADGE',
    badgeGlyph: '\u2660',
    order: 1,
    colour: '#2563eb',
  },
  {
    id: 'countyfair',
    name: 'COUNTY FAIR GYM',
    game: 'blackjack',
    leader: 'MASTER BUST',
    leaderTitle: 'BLACKJACK MASTER',
    quote: 'You have two choices. Only one of them is free.',
    badge: 'COUNTY BADGE',
    badgeGlyph: '\u2666',
    order: 2,
    colour: '#d97706',
  },
  {
    id: 'villaoak',
    name: 'VILLA OAK GYM',
    game: 'baccarat',
    leader: 'MASTER NEUTRAL',
    leaderTitle: 'BACCARAT MASTER',
    quote: 'Banker or player. Which one do you understand?',
    badge: 'OAK BADGE',
    badgeGlyph: '\u2665',
    order: 3,
    colour: '#b91c1c',
  },
  {
    id: 'riverstone',
    name: 'RIVERSTONE GYM',
    game: 'holdem',
    leader: 'MASTER RIVER',
    leaderTitle: 'POKER MASTER',
    quote: 'Seven cards, two of yours that matter.',
    badge: 'RIVER BADGE',
    badgeGlyph: '\u2663',
    order: 4,
    colour: '#15803d',
  },
];

export const GYM_BY_ID = Object.fromEntries(GYMS.map((g) => [g.id, g]));

export function gymForClass(classId) {
  const cls = CLASS_BY_ID[classId];
  return cls ? GYMS.find((g) => g.game === cls.game) ?? null : null;
}

export function gymByOrder(order) {
  return GYMS.find((g) => g.order === order) ?? null;
}

export function isUnlocked(gymId, badges) {
  const gym = GYM_BY_ID[gymId];
  if (!gym) return false;
  if (gym.order === 1) return true;
  const previous = gymByOrder(gym.order - 1);
  return previous ? badges.includes(previous.id) : false;
}