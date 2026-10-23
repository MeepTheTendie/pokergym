import Base
import ./src/evaluate.bend as E

# A royal flush (10,J,Q,K,A of spades) is category 9.
law eval5_royal:
  for a: U32
  {E.eval5_cat(32, 36, 40, 44, 48) == 9 : U32}

# A high-card hand is category 0.
law eval5_high_card:
  for a: U32
  {E.eval5_cat(0, 5, 10, 15, 20) == 0 : U32}
