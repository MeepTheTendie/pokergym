import { freshDeck, shuffle } from '../cards.js';

export const GAME = {
  id: 'blackjack',
  name: 'Blackjack',
  handSize: 2,
  deck: 'shoe',
  decks: 6,
  dealerRule: 'stands on all 17',
  doubleAfterSplit: true,
  resplitAces: false,
  surrender: false,
  peek: false,
};

export const PAY_TABLE = {
  blackjack: 1.5,
  win: 1,
  push: 0,
  lose: -1,
};

export const BET = 100;
export const BLACKJACK_TOTAL = 21;
export const DEALER_STANDS = 17;
export const MAX_HANDS = 4;

const RANK_NAME = {
  14: 'ACE', 13: 'KING', 12: 'QUEEN', 11: 'JACK', 10: 'TEN', 9: 'NINE',
  8: 'EIGHT', 7: 'SEVEN', 6: 'SIX', 5: 'FIVE', 4: 'FOUR', 3: 'THREE', 2: 'TWO',
};

export function rankName(rank) {
  return RANK_NAME[rank] ?? String(rank);
}

export function sumHand(cards) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.r === 14) {
      total += 11;
      aces++;
    } else if (card.r >= 10) {
      total += 10;
    } else {
      total += card.r;
    }
  }
  while (total > BLACKJACK_TOTAL && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export function isBlackjack(cards) {
  return cards.length === 2 && sumHand(cards).total === BLACKJACK_TOTAL;
}

export function newShoe(rng = Math.random, decks = GAME.decks) {
  const cards = [];
  for (let i = 0; i < decks; i++) cards.push(...freshDeck(rng));
  return shuffle(cards, rng);
}

export function shoeSize(decks = GAME.decks) {
  return decks * 52;
}

export function newRound(rng = Math.random, { bet = BET, decks = GAME.decks, player = null, dealer = null } = {}) {
  const shoe = newShoe(rng, decks);
  let hands;
  let dealerHand;
  if (player && dealer) {
    if (player.length !== 2 || dealer.length !== 2) {
      throw new Error('Rigged blackjack hands need exactly two cards each');
    }
    for (const card of [...player, ...dealer]) {
      const at = shoe.findIndex(c => c.r === card.r && c.s === card.s);
      if (at === -1) throw new Error(`Rigged card not in the shoe: ${card.r}/${card.s}`);
      shoe.splice(at, 1);
    }
    hands = [newHand(player.map(c => ({ ...c })), bet)];
    dealerHand = dealer.map(c => ({ ...c }));
  } else {
    hands = [newHand([shoe.shift(), shoe.shift()], bet)];
    dealerHand = [shoe.shift(), shoe.shift()];
  }
  const round = {
    game: GAME.id,
    deck: shoe,
    decks,
    bet,
    hands,
    activeHand: 0,
    dealerHand,
    dealerUpcard: null,
    holeRevealed: false,
    settled: false,
    payout: 0,
    outcome: null,
    result: null,
    log: [`SHOE CUT. ${decks} DECKS. YOU AND THE DEALER ARE IN THIS ONE SHOE.`],
  };
  round.dealerUpcard = round.dealerHand[0];
  round.hands[0].natural = isBlackjack(round.hands[0].cards);
  round.log.push('TWO CARDS EACH. THE DEALER SHOWS ONE. THE OTHER ONE STAYS FACE DOWN. NO PEEK FOR ANYBODY.');
  if (round.hands[0].natural || isBlackjack(round.dealerHand)) {
    round.log.push('NATUREL ON THE BOARD. THE ROUND IS OVER RIGHT NOW.');
    finishRound(round);
  }
  return round;
}

function newHand(cards, bet) {
  return { cards, bet, doubled: false, status: 'open', result: null, payout: 0, natural: false, fromSplit: false };
}

export function currentHand(round) {
  return round.hands[round.activeHand] ?? null;
}

export function canSplitHand(round, hand) {
  if (!round || round.settled) return false;
  if (!hand || hand.status !== 'open' || hand.cards.length !== 2) return false;
  if (round.hands.length >= MAX_HANDS) return false;
  if (hand.cards[0].r !== hand.cards[1].r) return false;
  if (hand.cards[0].r === 14 && hand.fromSplit && !GAME.resplitAces) return false;
  return true;
}

export function canDoubleHand(round, hand) {
  if (!round || round.settled) return false;
  if (!hand || hand.status !== 'open' || hand.cards.length !== 2) return false;
  return true;
}

export function legalActions(round) {
  if (!round || round.settled) return [];
  const hand = currentHand(round);
  if (!hand || hand.status !== 'open') return [];
  const actions = ['hit', 'stand'];
  if (canSplitHand(round, hand)) actions.push('split');
  if (canDoubleHand(round, hand)) actions.push('double');
  return actions;
}

export function setHolds() {
  return null;
}

export function toggleHold() {
  return null;
}

function nextOpenHand(round) {
  for (let i = round.activeHand + 1; i < round.hands.length; i++) {
    if (round.hands[i].status === 'open') {
      round.activeHand = i;
      round.log.push(`NOW YOUR SECOND HAND. ${sumHand(round.hands[i].cards).total}.`);
      return true;
    }
  }
  return false;
}

function advanceOrFinish(round) {
  if (!nextOpenHand(round)) finishRound(round);
}

export function hit(round) {
  if (!round || round.settled) throw new Error('the round is already settled');
  const hand = currentHand(round);
  if (!hand || hand.status !== 'open') throw new Error('there is no open hand to act on');
  hand.cards.push(round.deck.shift());
  const { total } = sumHand(hand.cards);
  round.log.push(`YOU HIT. ${total}.`);
  if (total > BLACKJACK_TOTAL) {
    hand.status = 'bust';
    round.log.push(`BUST ON ${total}. THE ${hand.bet} IS GONE.`);
    advanceOrFinish(round);
  } else if (total === BLACKJACK_TOTAL) {
    hand.status = 'stand';
    round.log.push('TWENTY ONE. BUT ON THREE CARDS OR MORE, SO IT PAYS EVEN MONEY, NOT THREE TO TWO.');
    advanceOrFinish(round);
  }
  return round;
}

export function stand(round) {
  if (!round || round.settled) throw new Error('the round is already settled');
  const hand = currentHand(round);
  if (!hand || hand.status !== 'open') throw new Error('there is no open hand to act on');
  hand.status = 'stand';
  round.log.push(`YOU STAND ON ${sumHand(hand.cards).total}.`);
  advanceOrFinish(round);
  return round;
}

export function double(round) {
  if (!round || round.settled) throw new Error('the round is already settled');
  const hand = currentHand(round);
  if (!canDoubleHand(round, hand)) throw new Error('you may only double on your first two cards');
  hand.bet *= 2;
  hand.doubled = true;
  hand.cards.push(round.deck.shift());
  const { total } = sumHand(hand.cards);
  round.log.push(`YOU DOUBLE TO ${hand.bet} AND TAKE ONE CARD. ${total}.`);
  if (total > BLACKJACK_TOTAL) {
    hand.status = 'bust';
    round.log.push('BUST ON THE DOUBLE. BOTH HALVES OF THE DOUBLE ARE GONE.');
  } else {
    hand.status = 'stand';
    round.log.push('A DOUBLE IS ONE CARD AND THEN YOU ARE DONE. NO CHOICE LEFT.');
  }
  advanceOrFinish(round);
  return round;
}

export function split(round) {
  if (!round || round.settled) throw new Error('the round is already settled');
  const hand = currentHand(round);
  if (!canSplitHand(round, hand)) {
    if (hand && hand.cards.length === 2 && hand.cards[0].r !== hand.cards[1].r) {
      throw new Error('you can only split a matching pair');
    }
    throw new Error('you cannot split this hand');
  }
  const [first, second] = hand.cards;
  const isAces = first.r === 14;
  hand.cards = [first, round.deck.shift()];
  hand.fromSplit = true;
  round.hands.push({
    ...newHand([second, round.deck.shift()], hand.bet),
    fromSplit: true,
  });
  round.log.push(`YOU SPLIT THE ${rankName(first.r)}S. TWO HANDS, TWO BETS OF ${hand.bet}.`);
  if (isAces) {
    for (const h of round.hands) if (h.status === 'open') h.status = 'stand';
    round.log.push('SPLIT ACES GET EXACTLY ONE CARD EACH AND THEN THEY STAND. NO EXCEPTIONS.');
    advanceOrFinish(round);
  }
  return round;
}

export function dealerPlay(round) {
  if (round.holeRevealed) return round;
  round.holeRevealed = true;
  round.log.push('THE DEALER TURNS THE HOLE CARD OVER.');
  // The dealer only draws against a live hand: if every player hand is busted
  // or already a natural, the round is decided and the shoe stays untouched.
  const live = round.hands.some((h) => !h.natural && h.status !== 'bust');
  if (live) {
    while (true) {
      const { total } = sumHand(round.dealerHand);
      if (total >= DEALER_STANDS) break;
      round.dealerHand.push(round.deck.shift());
      round.log.push(`DEALER HITS. NOW ${sumHand(round.dealerHand).total}.`);
    }
  }
  const { total, soft } = sumHand(round.dealerHand);
  round.log.push(
    total > BLACKJACK_TOTAL
      ? `DEALER BUSTS AT ${total}.`
      : `DEALER STANDS ON ${total}${soft ? ' (SOFT)' : ''}.`,
  );
  return round;
}

export function finishRound(round) {
  if (round.settled) return round;
  if (!round.holeRevealed) dealerPlay(round);

  const dealerTotal = sumHand(round.dealerHand).total;
  const dealerNatural = isBlackjack(round.dealerHand);

  for (const hand of round.hands) {
    if (hand.result) continue;
    const { total } = sumHand(hand.cards);
    if (hand.status === 'bust') {
      hand.result = 'lose';
      hand.payout = -hand.bet;
    } else if (hand.natural && dealerNatural) {
      hand.result = 'push';
      hand.payout = 0;
    } else if (hand.natural) {
      hand.result = 'blackjack';
      hand.payout = hand.bet * PAY_TABLE.blackjack;
    } else if (dealerNatural) {
      hand.result = 'lose';
      hand.payout = -hand.bet;
    } else if (dealerTotal > BLACKJACK_TOTAL) {
      hand.result = 'win';
      hand.payout = hand.bet;
    } else if (total > dealerTotal) {
      hand.result = 'win';
      hand.payout = hand.bet;
    } else if (total < dealerTotal) {
      hand.result = 'lose';
      hand.payout = -hand.bet;
    } else {
      hand.result = 'push';
      hand.payout = 0;
    }
  }

  round.payout = round.hands.reduce((sum, h) => sum + h.payout, 0);
  round.outcome = combineOutcomes(round.hands);
  round.result = round.outcome;
  round.settled = true;
  round.log.push(settleLine(round));
  return round;
}

function combineOutcomes(hands) {
  if (hands.length === 1) return hands[0].result;
  const signs = hands.map((h) => Math.sign(h.payout));
  if (signs.every((s) => s === 0)) return 'push';
  if (signs.every((s) => s >= 0)) return signs.some((s) => s > 0) ? 'win' : 'push';
  if (signs.every((s) => s <= 0)) return signs.some((s) => s < 0) ? 'lose' : 'push';
  return 'partial';
}

function settleLine(round) {
  const wins = round.hands.filter((h) => h.payout > 0).length;
  const losses = round.hands.filter((h) => h.payout < 0).length;
  const pushes = round.hands.filter((h) => h.payout === 0).length;
  const parts = [];
  if (wins) parts.push(`${wins} WIN`);
  if (losses) parts.push(`${losses} LOSE`);
  if (pushes) parts.push(`${pushes} PUSH`);
  return `${outcomeLabel(round)}. ${parts.join(', ')}. NET ${round.payout >= 0 ? '+' : ''}${round.payout}.`;
}

export function outcomeLabel(round) {
  switch (round.outcome) {
    case 'blackjack': return 'BLACKJACK';
    case 'win': return 'YOU WIN';
    case 'push': return 'PUSH';
    case 'lose': return 'YOU LOSE';
    case 'partial': return 'SPLIT: UP AND DOWN';
    default: return 'ROUND OVER';
  }
}

export function netFor(round) {
  return round.payout;
}
