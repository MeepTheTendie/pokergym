import { CLASS_BY_ID } from './classes.js';

export const GYMS = [
  {
    id: 'pokergym',
    name: 'POKER GYM',
    game: 'videopoker',
    leader: 'SENSEI ROYALE',
    leaderTitle: 'POKER SENSEI',
    quote: 'Five cards. No bluffing. Just the maths.',
    badge: 'JACKS BELT',
    badgeGlyph: '\u25a0',
    order: 1,
    colour: '#7aa2f7',
  },
  {
    id: 'countyfair',
    name: 'COUNTY FAIR GYM',
    game: 'blackjack',
    leader: 'SENSEI BUST',
    leaderTitle: 'BLACKJACK SENSEI',
    quote: 'You have two choices. Only one of them is free.',
    badge: 'COUNTY BELT',
    badgeGlyph: '\u25a0',
    order: 2,
    colour: '#f8a24b',
  },
  {
    id: 'villaoak',
    name: 'VILLA OAK GYM',
    game: 'baccarat',
    leader: 'SENSEI NEUTRAL',
    leaderTitle: 'BACCARAT SENSEI',
    quote: 'Banker or player. Which one do you understand?',
    badge: 'OAK BELT',
    badgeGlyph: '\u25a0',
    order: 3,
    colour: '#c792ea',
  },
  {
    id: 'riverstone',
    name: 'RIVERSTONE GYM',
    game: 'holdem',
    leader: 'SENSEI RIVER',
    leaderTitle: 'POKER SENSEI',
    quote: 'Seven cards, two of yours that matter.',
    badge: 'RIVER BELT',
    badgeGlyph: '\u25a0',
    order: 4,
    colour: '#6ee7b7',
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