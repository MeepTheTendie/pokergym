import Base
import ./evaluate.bend as E

# WIN codes (mirror src/games/videopoker.js WIN).
def w_none() -> U32: U32.from_nat(0n)
def w_low_pair() -> U32: U32.from_nat(1n)
def w_jacks() -> U32: U32.from_nat(2n)
def w_two_pair() -> U32: U32.from_nat(3n)
def w_three() -> U32: U32.from_nat(4n)
def w_straight() -> U32: U32.from_nat(5n)
def w_flush() -> U32: U32.from_nat(6n)
def w_full_house() -> U32: U32.from_nat(7n)
def w_four_kind() -> U32: U32.from_nat(8n)
def w_four_5k() -> U32: U32.from_nat(9n)
def w_four_234() -> U32: U32.from_nat(10n)
def w_four_aces() -> U32: U32.from_nat(11n)
def w_four_234_kicker() -> U32: U32.from_nat(12n)
def w_four_aces_kicker() -> U32: U32.from_nat(13n)
def w_straight_flush() -> U32: U32.from_nat(14n)
def w_royal() -> U32: U32.from_nat(15n)

def pick(+cond: Bool, +a: U32, +b: U32) -> U32:
  match cond:
    case True{}: a
    case False{}: b

def rank_idx(+card: U32) -> U32:
  U32.div(card, U32.from_nat(4n))

# win_code for non-wild variants. min_pair_rank is the variant's threshold
# (11 for Jacks-or-Better). quad_tiers is 1 when the variant distinguishes
# quads by rank/kicker (Bonus/Double Double Bonus), else 0.
def win_code(+c0: U32, +c1: U32, +c2: U32, +c3: U32, +c4: U32, +min_pair_rank: U32, +quad_tiers: U32) -> U32:
  +a = rank_idx(c0)
  +b = rank_idx(c1)
  +c = rank_idx(c2)
  +d = rank_idx(c3)
  +e = rank_idx(c4)

  +cat = E.eval5_cat(c0, c1, c2, c3, c4)

  # counts of each card's rank
  +ca = U32.add(U32.add(U32.add(U32.add(U32.from_nat(1n), pick(U32.is_eq(b, a), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(c, a), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(d, a), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(e, a), U32.from_nat(1n), U32.from_nat(0n)))
  +cb = U32.add(U32.add(U32.add(U32.add(U32.from_nat(1n), pick(U32.is_eq(a, b), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(c, b), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(d, b), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(e, b), U32.from_nat(1n), U32.from_nat(0n)))
  +cc = U32.add(U32.add(U32.add(U32.add(U32.from_nat(1n), pick(U32.is_eq(a, c), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(b, c), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(d, c), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(e, c), U32.from_nat(1n), U32.from_nat(0n)))
  +cd = U32.add(U32.add(U32.add(U32.add(U32.from_nat(1n), pick(U32.is_eq(a, d), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(b, d), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(c, d), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(e, d), U32.from_nat(1n), U32.from_nat(0n)))
  +ce = U32.add(U32.add(U32.add(U32.add(U32.from_nat(1n), pick(U32.is_eq(a, e), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(b, e), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(c, e), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(d, e), U32.from_nat(1n), U32.from_nat(0n)))

  # pair rank (first rank with count 2), quad rank, kicker rank
  +pair_rank = pick(U32.is_eq(ca, U32.from_nat(2n)), a,
                  pick(U32.is_eq(cb, U32.from_nat(2n)), b,
                    pick(U32.is_eq(cc, U32.from_nat(2n)), c,
                      pick(U32.is_eq(cd, U32.from_nat(2n)), d,
                        pick(U32.is_eq(ce, U32.from_nat(2n)), e, U32.from_nat(0n))))))
  +quad_rank = pick(U32.is_eq(ca, U32.from_nat(4n)), a,
                  pick(U32.is_eq(cb, U32.from_nat(4n)), b,
                    pick(U32.is_eq(cc, U32.from_nat(4n)), c,
                      pick(U32.is_eq(cd, U32.from_nat(4n)), d,
                        pick(U32.is_eq(ce, U32.from_nat(4n)), e, U32.from_nat(0n))))))
  +kicker_rank = pick(U32.is_eq(ca, U32.from_nat(1n)), a,
                    pick(U32.is_eq(cb, U32.from_nat(1n)), b,
                      pick(U32.is_eq(cc, U32.from_nat(1n)), c,
                        pick(U32.is_eq(cd, U32.from_nat(1n)), d,
                          pick(U32.is_eq(ce, U32.from_nat(1n)), e, U32.from_nat(0n))))))

  # quad tiers mapping (only used when cat == 7, i.e. four of a kind)
  +low_kicker = Bool.or(U32.is_eq(kicker_rank, U32.from_nat(0n)), Bool.or(U32.is_eq(kicker_rank, U32.from_nat(1n)), U32.is_eq(kicker_rank, U32.from_nat(2n))))
  +quad_code = pick(U32.is_eq(quad_tiers, U32.from_nat(0n)), w_four_kind(),
                  pick(U32.is_eq(quad_rank, U32.from_nat(12n)), pick(low_kicker, w_four_aces_kicker(), w_four_aces()),
                    pick(U32.is_le(quad_rank, U32.from_nat(2n)), pick(Bool.or(U32.is_eq(kicker_rank, U32.from_nat(12n)), low_kicker), w_four_234_kicker(), w_four_234()),
                      w_four_5k())))

  # category dispatch
  pick(U32.is_eq(cat, U32.from_nat(0n)), w_none(),
    pick(U32.is_eq(cat, U32.from_nat(1n)), pick(U32.is_ge(pair_rank, min_pair_rank), w_jacks(), w_low_pair()),
      pick(U32.is_eq(cat, U32.from_nat(2n)), w_two_pair(),
        pick(U32.is_eq(cat, U32.from_nat(3n)), w_three(),
          pick(U32.is_eq(cat, U32.from_nat(4n)), w_straight(),
            pick(U32.is_eq(cat, U32.from_nat(5n)), w_flush(),
              pick(U32.is_eq(cat, U32.from_nat(6n)), w_full_house(),
                pick(U32.is_eq(cat, U32.from_nat(7n)), quad_code,
                  pick(U32.is_eq(cat, U32.from_nat(8n)), w_straight_flush(),
                    pick(U32.is_eq(cat, U32.from_nat(9n)), w_royal(), w_none()))))))))))

def main() -> U32:
  # Jacks or Better, pair of jacks -> 2
  win_code(44, 45, 30, 19, 8, U32.from_nat(11n), U32.from_nat(0n))
