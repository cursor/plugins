module

public import Veil

/-
Veil translation of `pstack/skills/statechart/scripts/test/corpus/DieHard/DieHard.tla`: the
jug puzzle from Die Hard 3. The spec writes the goal, 4 gallons in the big jug, as
an invariant that should break, so the counterexample is the solution.
-/

veil module DieHard

-- VARIABLES big, small
individual big : Nat
individual small : Nat

#gen_state

-- Min(m, n) == IF m < n THEN m ELSE n
def Min (m n : Nat) : Nat := if m < n then m else n

-- Init == big = 0 /\ small = 0
after_init {
  big := 0
  small := 0
}

-- FillSmall == small' = 3 /\ big' = big
action FillSmall {
  small := 3
}

-- FillBig == big' = 5 /\ small' = small
action FillBig {
  big := 5
}

-- EmptySmall == small' = 0 /\ big' = big
action EmptySmall {
  small := 0
}

-- EmptyBig == big' = 0 /\ small' = small
action EmptyBig {
  big := 0
}

-- SmallToBig ==
--   /\ big' = Min(big + small, 5)
--   /\ small' = small - (big' - big)
-- `small'` reads both the new and the old `big`, so the new value goes in a `let` first.
action SmallToBig {
  let newBig := Min (big + small) 5
  small := small - (newBig - big)
  big := newBig
}

-- BigToSmall ==
--   /\ small' = Min(big + small, 3)
--   /\ big' = big - (small' - small)
action BigToSmall {
  let newSmall := Min (big + small) 3
  big := big - (newSmall - small)
  small := newSmall
}

-- TypeOK == small \in 0..3 /\ big \in 0..5
-- `Nat` does not bound the values, so the bounds stay an invariant.
invariant [TypeOK] small ≤ 3 ∧ big ≤ 5

-- NotSolved == big # 4
invariant [NotSolved] big ≠ 4

termination false

#gen_spec

-- TLC checks this spec with `DieHard.cfg`. The check below uses the cfg's instance. The module
-- has no `type`s, `param`s, or `immutable` fields, so both arguments are empty.
-- From this project's root, `lake lean Corpus/DieHard.lean` prints the result.
-- It finds a violation of `NotSolved` after 6 steps: the solution. TLC reports `NotSolved` with
-- a 6-step trace too.
-- * `INVARIANTS TypeOK NotSolved`: the two `invariant`s above.
-- * Deadlock: `termination false` above reports every state without successors, as TLC does.
-- * `set_option veil.violationIsError false in` reports the expected violation as information,
--   so that the file still builds.
set_option veil.violationIsError false in
#model_check {} {}

end DieHard
