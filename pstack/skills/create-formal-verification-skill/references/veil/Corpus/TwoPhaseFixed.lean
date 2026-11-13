module

public import Veil

-- Lean rebuilds each proof that the SMT solver finds and checks it in its kernel. Without this
-- option, Veil trusts the solver and warns `Trusting SMT solver for 64 goals`.
set_option veil.smt.trust false

/-
Veil translation of `pstack/skills/statechart/scripts/test/corpus/TwoPhaseFixed/TwoPhaseFixed.tla`:
Lamport's two-phase commit. The transaction manager commits only when every
resource manager has prepared.

The translation is `TwoPhase.lean` with the fix in `TMCommit`. The file then adds
what TLC cannot give: invariants that `#check_invariants` proves for every number
of resource managers.
-/

veil module TwoPhaseFixed

type RM
enum RMState = { working, prepared, committed, aborted }
enum TMState = { init, done }

function rmState (r : RM) : RMState
individual tmState : TMState
relation tmPrepared (r : RM) : Bool
-- `msgs` as one Boolean field per kind of message, as in `TwoPhase.lean`.
relation msgPrepared (r : RM) : Bool
individual msgCommit : Bool
individual msgAbort : Bool

#gen_state

after_init {
  rmState R := working
  tmState := init
  tmPrepared R := false
  msgPrepared R := false
  msgCommit := false
  msgAbort := false
}

action TMRcvPrepared (r : RM) {
  require tmState = init
  require msgPrepared r
  tmPrepared r := true
}

-- TMCommit ==
--   /\ tmState = "init"
--   /\ tmPrepared = RM
--   /\ tmState' = "done"
--   /\ msgs' = msgs \cup {[type |-> "Commit"]}
--   /\ UNCHANGED <<rmState, tmPrepared>>
action TMCommit {
  require tmState = init
  require ∀ r, tmPrepared r
  tmState := done
  msgCommit := true
}

action TMAbort {
  require tmState = init
  tmState := done
  msgAbort := true
}

action RMPrepare (r : RM) {
  require rmState r = working
  rmState r := prepared
  msgPrepared r := true
}

action RMChooseToAbort (r : RM) {
  require rmState r = working
  rmState r := aborted
}

action RMRcvCommitMsg (r : RM) {
  require msgCommit
  rmState r := committed
}

action RMRcvAbortMsg (r : RM) {
  require msgAbort
  rmState r := aborted
}

invariant [TCConsistent] ¬ (rmState R1 = aborted ∧ rmState R2 = committed)

-- `TCConsistent` alone is not inductive: some unreachable states satisfy it and step to
-- states that break it. These invariants rule those states out. `#model_check` checks them on
-- the instance below, and `#check_invariants` proves that together they hold in every
-- reachable state of every instance. The source has no counterpart.
invariant [tm_prepared_was_sent] tmPrepared R → msgPrepared R
invariant [prepared_left_working] msgPrepared R → rmState R ≠ working
invariant [commit_needs_all_prepared] msgCommit → tmPrepared R
invariant [one_decision] ¬ (msgCommit ∧ msgAbort)
invariant [no_decision_before_done] tmState = init → ¬ msgCommit ∧ ¬ msgAbort
invariant [committed_needs_commit] rmState R = committed → msgCommit
invariant [abort_after_prepare_needs_abort] msgPrepared R ∧ rmState R = aborted → msgAbort

termination false

#gen_spec

-- TLC checks this spec with `TwoPhaseFixed.cfg`. The check below uses the cfg's instance.
-- From this project's root, `lake lean Corpus/TwoPhaseFixed.lean` runs every check in
-- this file.
-- It finds no violation, in as many distinct states as TLC (56).
--
-- * `RM := Fin 2`: the resource managers are `0` and `1`, for the cfg's `RM = {r1, r2}`.
-- * `INVARIANT TPTypeOK`: Lean's types ensure it. `INVARIANT TCConsistent`: the
--   `invariant [TCConsistent]` above. The other invariants have no cfg counterpart.
-- * Deadlock: `termination false` above reports every state without successors, as TLC does.
#model_check { RM := Fin 2 } {}

-- A run exists in which some resource manager commits, for some number of resource managers.
-- This shows that the proof below is not about a model in which nothing happens.
sat trace [can_commit] {
  any 4 actions
  assert (∃ r, rmState r = committed)
}

-- Proves with an SMT solver that the conjunction of the invariants above holds in every initial
-- state and that every action preserves it, for every type `RM`. So `TCConsistent` holds in
-- every reachable state, for any number of resource managers.
#check_invariants

end TwoPhaseFixed
