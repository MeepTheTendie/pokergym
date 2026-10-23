import Base

def pick(+cond: Bool, +a: U32, +b: U32) -> U32:
  match cond:
    case True{}:
      a
    case False{}:
      b

def min2_help(+lt: Bool, +a: U32, +b: U32) -> U32:
  match lt:
    case True{}:
      a
    case False{}:
      b

def min2(+a: U32, +b: U32) -> U32:
  min2_help(U32.is_lt(a, b), a, b)

def max2_help(+lt: Bool, +a: U32, +b: U32) -> U32:
  match lt:
    case True{}:
      b
    case False{}:
      a

def max2(+a: U32, +b: U32) -> U32:
  max2_help(U32.is_lt(a, b), a, b)

def rank_idx(+card: U32) -> U32:
  U32.div(card, U32.from_nat(4n))

def suit_idx(+card: U32) -> U32:
  U32.mod(card, U32.from_nat(4n))

def eval5_cat(+c0: U32, +c1: U32, +c2: U32, +c3: U32, +c4: U32) -> U32:
  +a = rank_idx(c0)
  +b = rank_idx(c1)
  +c = rank_idx(c2)
  +d = rank_idx(c3)
  +e = rank_idx(c4)

  +sa = suit_idx(c0)
  +sb = suit_idx(c1)
  +sc = suit_idx(c2)
  +sd = suit_idx(c3)
  +se = suit_idx(c4)

  # distinct count
  +dup_b = pick(U32.is_eq(b, a), U32.from_nat(1n), U32.from_nat(0n))
  +dup_c = pick(Bool.or(U32.is_eq(c, a), U32.is_eq(c, b)), U32.from_nat(1n), U32.from_nat(0n))
  +dup_d = pick(Bool.or(U32.is_eq(d, a), Bool.or(U32.is_eq(d, b), U32.is_eq(d, c))), U32.from_nat(1n), U32.from_nat(0n))
  +dup_e = pick(Bool.or(U32.is_eq(e, a), Bool.or(U32.is_eq(e, b), Bool.or(U32.is_eq(e, c), U32.is_eq(e, d)))), U32.from_nat(1n), U32.from_nat(0n))
  +dup = U32.add(U32.add(dup_b, dup_c), U32.add(dup_d, dup_e))
  +distinct = U32.sub(U32.from_nat(5n), dup)

  # max count of any rank
  +ca = U32.add(U32.add(U32.add(U32.add(U32.from_nat(1n), pick(U32.is_eq(b, a), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(c, a), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(d, a), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(e, a), U32.from_nat(1n), U32.from_nat(0n)))
  +cb = U32.add(U32.add(U32.add(U32.add(U32.from_nat(1n), pick(U32.is_eq(a, b), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(c, b), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(d, b), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(e, b), U32.from_nat(1n), U32.from_nat(0n)))
  +cc = U32.add(U32.add(U32.add(U32.add(U32.from_nat(1n), pick(U32.is_eq(a, c), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(b, c), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(d, c), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(e, c), U32.from_nat(1n), U32.from_nat(0n)))
  +cd = U32.add(U32.add(U32.add(U32.add(U32.from_nat(1n), pick(U32.is_eq(a, d), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(b, d), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(c, d), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(e, d), U32.from_nat(1n), U32.from_nat(0n)))
  +ce = U32.add(U32.add(U32.add(U32.add(U32.from_nat(1n), pick(U32.is_eq(a, e), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(b, e), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(c, e), U32.from_nat(1n), U32.from_nat(0n))), pick(U32.is_eq(d, e), U32.from_nat(1n), U32.from_nat(0n)))
  +maxcount = max2(max2(ca, cb), max2(max2(cc, cd), ce))

  # min/max ranks
  +mn = min2(min2(min2(min2(a, b), c), d), e)
  +mx = max2(max2(max2(max2(a, b), c), d), e)
  +range = U32.sub(mx, mn)

  # has0..has12 presence
  +has0 = Bool.or(Bool.or(Bool.or(Bool.or(U32.is_eq(a, U32.from_nat(0n)), U32.is_eq(b, U32.from_nat(0n))), U32.is_eq(c, U32.from_nat(0n))), U32.is_eq(d, U32.from_nat(0n))), U32.is_eq(e, U32.from_nat(0n)))
  +has1 = Bool.or(Bool.or(Bool.or(Bool.or(U32.is_eq(a, U32.from_nat(1n)), U32.is_eq(b, U32.from_nat(1n))), U32.is_eq(c, U32.from_nat(1n))), U32.is_eq(d, U32.from_nat(1n))), U32.is_eq(e, U32.from_nat(1n)))
  +has2 = Bool.or(Bool.or(Bool.or(Bool.or(U32.is_eq(a, U32.from_nat(2n)), U32.is_eq(b, U32.from_nat(2n))), U32.is_eq(c, U32.from_nat(2n))), U32.is_eq(d, U32.from_nat(2n))), U32.is_eq(e, U32.from_nat(2n)))
  +has3 = Bool.or(Bool.or(Bool.or(Bool.or(U32.is_eq(a, U32.from_nat(3n)), U32.is_eq(b, U32.from_nat(3n))), U32.is_eq(c, U32.from_nat(3n))), U32.is_eq(d, U32.from_nat(3n))), U32.is_eq(e, U32.from_nat(3n)))
  +has12 = Bool.or(Bool.or(Bool.or(Bool.or(U32.is_eq(a, U32.from_nat(12n)), U32.is_eq(b, U32.from_nat(12n))), U32.is_eq(c, U32.from_nat(12n))), U32.is_eq(d, U32.from_nat(12n))), U32.is_eq(e, U32.from_nat(12n)))

  +wheel = Bool.and(Bool.and(Bool.and(Bool.and(has0, has1), has2), has3), has12)
  +straight = Bool.and(U32.is_eq(distinct, U32.from_nat(5n)), Bool.or(U32.is_eq(range, U32.from_nat(4n)), wheel))

  +flush = Bool.and(Bool.and(U32.is_eq(sa, sb), U32.is_eq(sa, sc)), Bool.and(U32.is_eq(sa, sd), U32.is_eq(sa, se)))

  +royal = Bool.and(straight, Bool.and(flush, U32.is_eq(mn, U32.from_nat(8n))))

  +sf = Bool.and(straight, flush)

  +four = Bool.and(U32.is_eq(distinct, U32.from_nat(2n)), U32.is_eq(maxcount, U32.from_nat(4n)))
  +full = Bool.and(U32.is_eq(distinct, U32.from_nat(2n)), U32.is_eq(maxcount, U32.from_nat(3n)))
  +three = Bool.and(U32.is_eq(distinct, U32.from_nat(3n)), U32.is_eq(maxcount, U32.from_nat(3n)))
  +twoPair = Bool.and(U32.is_eq(distinct, U32.from_nat(3n)), U32.is_eq(maxcount, U32.from_nat(2n)))
  +onePair = U32.is_eq(distinct, U32.from_nat(4n))

  pick(sf, pick(royal, U32.from_nat(9n), U32.from_nat(8n)),
    pick(four, U32.from_nat(7n),
      pick(full, U32.from_nat(6n),
        pick(flush, U32.from_nat(5n),
          pick(straight, U32.from_nat(4n),
            pick(three, U32.from_nat(3n),
              pick(twoPair, U32.from_nat(2n),
                pick(onePair, U32.from_nat(1n), U32.from_nat(0n)))))))))

def main() -> U32:
  # example: royal flush 10,J,Q,K,A all spades: packed ranks 8..12, suit 0
  eval5_cat(32, 36, 40, 44, 48)
