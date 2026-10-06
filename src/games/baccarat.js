import { freshDeck, shuffle } from '../cards.js';

export const GAME = {
  id: 'baccarat',
  name: 'Baccarat',
  handSize: 2,
  deck: 'shoe',
  decks: 8,
};

export const PAY_TABLE = {
  banker: 0.95, // 5% commission, which is what makes the banker side the best bet
  player: 1.0,
  tie: 8.0, // 8:1 on a tie bet only
};

export function cardValue(r) {
  if (r >= 10 && r < 14) return 0;
  if (r === 14) return 1;
  return r % 10;
}

export function handTotal(hand) {
  let total = 0;
  for (const c of hand) total += cardValue(c.r);
  return total % 10;
}

export function newShoe(rng = Math.random, decks = GAME.decks) {
  const cards = [];
  for (let d = 0; d < decks; d++) {
    cards.push(...freshDeck(rng));
  }
  return shuffle(cards, rng);
}

function drawThirdCardPlayer(playerTotal) {
  return playerTotal <= 5;
}

function drawThirdCardBanker(bankerTotal, playerThirdCardValue) {
  if (playerThirdCardValue === undefined) {
    return bankerTotal <= 5;
  }
  switch (bankerTotal) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return playerThirdCardValue !== 8;
    case 4:
      return playerThirdCardValue >= 2 && playerThirdCardValue <= 7;
    case 5:
      return playerThirdCardValue >= 4 && playerThirdCardValue <= 7;
    case 6:
      return playerThirdCardValue >= 6 && playerThirdCardValue <= 7;
    case 7:
      return false;
    default:
      return false;
  }
}

export function newRound(rng = Math.random, betOn = 'player', amount = 1, decks = GAME.decks) {
  const deck = newShoe(rng, decks);
  const playerHand = [deck.shift(), deck.shift()];
  const bankerHand = [deck.shift(), deck.shift()];
  let playerThird = null;
  let bankerThird = null;

  const playerTotal = handTotal(playerHand);
  const bankerTotalBefore = handTotal(bankerHand);

  // A natural (8 or 9 on the first two cards) ends the round immediately:
  // neither side takes a third card. Omitting this check is what made tie
  // frequency come out at 11.32% instead of the true 9.5156%.
  const natural = playerTotal >= 8 || bankerTotalBefore >= 8;

  if (!natural && drawThirdCardPlayer(playerTotal)) {
    playerThird = deck.shift();
    playerHand.push(playerThird);
  }

  const playerThirdValue = playerThird ? cardValue(playerThird.r) : undefined;
  if (!natural && drawThirdCardBanker(bankerTotalBefore, playerThirdValue)) {
    bankerThird = deck.shift();
    bankerHand.push(bankerThird);
  }

  const finalPlayerTotal = handTotal(playerHand);
  const finalBankerTotal = handTotal(bankerHand);

  let result;
  if (finalPlayerTotal > finalBankerTotal) result = 'player';
  else if (finalBankerTotal > finalPlayerTotal) result = 'banker';
  else result = 'tie';

  /*
   * A tie pushes on the player and banker bets. That is what produces the
   * familiar 1.24% and 1.06% house edges; paying 8:1 on a tie here instead would
   * hand the player side a huge edge. The 8:1 belongs to a bet on the tie.
   */
  let payout = 0;
  if (betOn === 'player') {
    payout = result === 'player' ? amount * PAY_TABLE.player : result === 'tie' ? 0 : -amount;
  } else if (betOn === 'banker') {
    payout = result === 'banker' ? amount * PAY_TABLE.banker : result === 'tie' ? 0 : -amount;
  } else if (betOn === 'tie') {
    payout = result === 'tie' ? amount * PAY_TABLE.tie : -amount;
  }

  const log = [
    `YOU BET ${String(betOn).toUpperCase()} FOR ${amount}.`,
    `PLAYER ${finalPlayerTotal}, BANKER ${finalBankerTotal}. ${result.toUpperCase()}.`,
    payout > 0 ? `PAYS +${payout}.` : payout < 0 ? `PAYS ${payout}.` : 'TIE PUSHES. THE BET COMES BACK.',
  ];

  return {
    game: GAME.id,
    deck,
    betOn,
    amount,
    playerHand,
    bankerHand,
    playerThird,
    bankerThird,
    playerTotal: finalPlayerTotal,
    bankerTotal: finalBankerTotal,
    result,
    payout,
    settled: true,
    log,
  };
}

export function setHolds() { return null; }
export function toggleHold() { return null; }
