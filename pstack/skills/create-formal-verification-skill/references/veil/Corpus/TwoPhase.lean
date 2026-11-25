module

public import Veil

/-
Veil translation of `pstack/skills/statechart/scripts/test/corpus/TwoPhase/TwoPhase.tla`:
Lamport's two-phase commit with one seeded bug. The transaction manager commits
as soon as any resource manager has prepared, not all of them.

Each TLA+ definition appears above its Veil counterpart. The set `msgs` becomes
one Boolean field per kind of message: `msgPrepared r` means that
`[type |-> "Prepared", rm |-> r] \in msgs`, and `msgCommit` and `msgAbort` mean
that the Commit and Abort messages are in `msgs`. As in the source, no action
removes a message.
-/

veil module TwoPhase

-- CONSTANT RM
type RM

-- rmState \in [RM -> {"working", "prepared", "committed", "aborted"}]
enum RMState = { working, prepared, committed, aborted }
-- tmState \in {"init", "done"}
enum TMState = { init, done }

-- VARIABLES rmState, tmState, tmPrepared, msgs
function rmState (r : RM) : RMState
individual tmState : TMState
relation tmPrepared (r : RM) : Bool
relation msgPrepared (r : RM) : Bool
individual msgCommit : Bool
individual msgAbort : Bool

#gen_state

-- TPInit ==
--   /\ rmState = [r \in RM |-> "working"]
--   /\ tmState = "init"
--   /\ tmPrepared = {}
--   /\ msgs = {}
after_init {
  rmState R := working
  tmState := init
  tmPrepared R := false
  msgPrepared R := false
  msgCommit := false
  msgAbort := false
}

-- TMRcvPrepared(r) ==
--   /\ tmState = "init"
--   /\ [type |-> "Prepared", rm |-> r] \in msgs
--   /\ tmPrepared' = tmPrepared \cup {r}
--   /\ UNCHANGED <<rmState, tmState, msgs>>
action TMRcvPrepared (r : RM) {
  require tmState = init
  require msgPrepared r
  tmPrepared r := true
}

-- TMCommit ==
--   /\ tmState = "init"
--   /\ tmPrepared # {}
--   /\ tmState' = "done"
--   /\ msgs' = msgs \cup {[type |-> "Commit"]}
--   /\ UNCHANGED <<rmState, tmPrepared>>
action TMCommit {
  require tmState = init
  -- The seeded bug: some resource manager has prepared, not every one.
  require ∃ r, tmPrepared r
  tmState := done
  msgCommit := true
}

-- TMAbort ==
--   /\ tmState = "init"
--   /\ tmState' = "done"
--   /\ msgs' = msgs \cup {[type |-> "Abort"]}
--   /\ UNCHANGED <<rmState, tmPrepared>>
action TMAbort {
  require tmState = init
  tmState := done
  msgAbort := true
}

-- RMPrepare(r) ==
--   /\ rmState[r] = "working"
--   /\ rmState' = [rmState EXCEPT ![r] = "prepared"]
--   /\ msgs' = msgs \cup {[type |-> "Prepared", rm |-> r]}
--   /\ UNCHANGED <<tmState, tmPrepared>>
action RMPrepare (r : RM) {
  require rmState r = working
  rmState r := prepared
  msgPrepared r := true
}

-- RMChooseToAbort(r) ==
--   /\ rmState[r] = "working"
--   /\ rmState' = [rmState EXCEPT ![r] = "aborted"]
--   /\ UNCHANGED <<tmState, tmPrepared, msgs>>
action RMChooseToAbort (r : RM) {
  require rmState r = working
  rmState r := aborted
}

-- RMRcvCommitMsg(r) ==
--   /\ [type |-> "Commit"] \in msgs
--   /\ rmState' = [rmState EXCEPT ![r] = "committed"]
--   /\ UNCHANGED <<tmState, tmPrepared, msgs>>
action RMRcvCommitMsg (r : RM) {
  require msgCommit
  rmState r := committed
}

-- RMRcvAbortMsg(r) ==
--   /\ [type |-> "Abort"] \in msgs
--   /\ rmState' = [rmState EXCEPT ![r] = "aborted"]
--   /\ UNCHANGED <<tmState, tmPrepared, msgs>>
action RMRcvAbortMsg (r : RM) {
  require msgAbort
  rmState r := aborted
}

-- TCConsistent ==
--   \A r1, r2 \in RM : ~ /\ rmState[r1] = "aborted"
--                        /\ rmState[r2] = "committed"
invariant [TCConsistent] ¬ (rmState R1 = aborted ∧ rmState R2 = committed)

-- TLC checks for deadlock, because `TwoPhase.cfg` does not turn it off.
termination false

#gen_spec

-- TLC checks this spec with `TwoPhase.cfg`. The check below uses the cfg's instance.
-- Lean runs the check when it elaborates this file. From this project's
-- root, `lake lean Corpus/TwoPhase.lean` prints the result.
-- It finds a violation of `TCConsistent` after 5 steps. TLC reports `TCConsistent` with a
-- 5-step trace too.
--
-- The instantiation (first `{ ... }` argument) sets the module's `type`s:
-- * `RM := Fin 2`: the resource managers are `0` and `1`, for the cfg's `RM = {r1, r2}`.
-- The theory (second `{ ... }` argument) is empty, because the module has no `immutable` fields.
--
-- The other settings of the cfg:
-- * `INVARIANT TPTypeOK`: Lean's types ensure it.
-- * `INVARIANT TCConsistent`: the `invariant [TCConsistent]` above.
-- * Deadlock: `termination false` above reports every state without successors, as TLC does.
-- Options:
-- * `set_option veil.violationIsError false in` reports the expected violation as information,
--   so that the file still builds. Without it, the violation is an error and `lake lean` exits
--   with 1.
set_option veil.violationIsError false in
#model_check { RM := Fin 2 } {}

end TwoPhase
