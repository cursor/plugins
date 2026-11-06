module

public import Veil

/-
Veil translation of `pstack/skills/statechart/scripts/test/corpus/LoginGuarded/LoginGuarded.tla`:
a sign-in flow with two regions, Session and Wrong tries. Three wrong passwords
lock the account until 15 minutes pass.
-/

veil module LoginGuarded

-- sessionStates == {"Checking the password", "Signed in", "Signed out"}
enum Session = { checkingThePassword, signedIn, signedOut }
-- wrongTriesStates == {"1 wrong try", "2 wrong tries", "Locked out", "No wrong tries"}
enum WrongTries = { oneWrongTry, twoWrongTries, lockedOut, noWrongTries }

-- VARIABLES session, wrongTries
individual session : Session
individual wrongTries : WrongTries

#gen_state

-- Init ==
--     /\ session = "Signed out"
--     /\ wrongTries = "No wrong tries"
after_init {
  session := signedOut
  wrongTries := noWrongTries
}

-- YouSubmitAPassword ==
--     /\ \/ (session = "Signed out" /\ ~(wrongTries = "Locked out") /\ session' = "Checking the password")
--     /\ UNCHANGED <<wrongTries>>
action YouSubmitAPassword {
  require session = signedOut ∧ ¬ (wrongTries = lockedOut)
  session := checkingThePassword
}

-- In the two actions below, each extra disjunct of the source's guard implies
-- `session = "Checking the password"`, so the guard equals that condition. The update
-- of `wrongTries` reads the old `session`, so it comes before the update of `session`.

-- ThePasswordIsRight ==
--     /\ (session \in {"Checking the password"} \/ (wrongTries = "1 wrong try" /\ session = "Checking the password") \/ (wrongTries = "2 wrong tries" /\ session = "Checking the password"))
--     /\ \/ (session = "Checking the password" /\ session' = "Signed in")
--        \/ (session \notin {"Checking the password"} /\ UNCHANGED session)
--     /\ \/ (wrongTries = "1 wrong try" /\ session = "Checking the password" /\ wrongTries' = "No wrong tries")
--        \/ (wrongTries = "2 wrong tries" /\ session = "Checking the password" /\ wrongTries' = "No wrong tries")
--        \/ (~(...) /\ UNCHANGED wrongTries)
action ThePasswordIsRight {
  require session = checkingThePassword
  if (wrongTries = oneWrongTry ∨ wrongTries = twoWrongTries) ∧ session = checkingThePassword then
    wrongTries := noWrongTries
  if session = checkingThePassword then session := signedIn
}

-- ThePasswordIsWrong ==
--     /\ (session \in {"Checking the password"} \/ ...)
--     /\ \/ (session = "Checking the password" /\ session' = "Signed out")
--        \/ (session \notin {"Checking the password"} /\ UNCHANGED session)
--     /\ \/ (wrongTries = "No wrong tries" /\ session = "Checking the password" /\ wrongTries' = "1 wrong try")
--        \/ (wrongTries = "1 wrong try" /\ session = "Checking the password" /\ wrongTries' = "2 wrong tries")
--        \/ (wrongTries = "2 wrong tries" /\ session = "Checking the password" /\ wrongTries' = "Locked out")
--        \/ (~(...) /\ UNCHANGED wrongTries)
action ThePasswordIsWrong {
  require session = checkingThePassword
  if wrongTries = noWrongTries ∧ session = checkingThePassword then wrongTries := oneWrongTry
  else if wrongTries = oneWrongTry ∧ session = checkingThePassword then wrongTries := twoWrongTries
  else if wrongTries = twoWrongTries ∧ session = checkingThePassword then wrongTries := lockedOut
  if session = checkingThePassword then session := signedOut
}

-- YouSignOut == session = "Signed in" /\ session' = "Signed out" /\ UNCHANGED wrongTries
action YouSignOut {
  require session = signedIn
  session := signedOut
}

-- S15MinutesPass == wrongTries = "Locked out" /\ wrongTries' = "No wrong tries" /\ UNCHANGED session
action S15MinutesPass {
  require wrongTries = lockedOut
  wrongTries := noWrongTries
}

-- SignedInWhileLocked == ~(session = "Signed in" /\ wrongTries = "Locked out")
invariant [SignedInWhileLocked] ¬ (session = signedIn ∧ wrongTries = lockedOut)

termination false

#gen_spec

-- TLC checks this spec with `LoginGuarded.cfg`. The check below uses the cfg's instance. The
-- module has no `type`s, `param`s, or `immutable` fields, so both arguments are empty.
-- From this project's root, `lake lean Corpus/LoginGuarded.lean` prints the result.
-- It finds no violation, in as many distinct states as TLC (8).
-- * `INVARIANT TypeOK`: Lean's types ensure it.
-- * `INVARIANT SignedInWhileLocked`: the `invariant [SignedInWhileLocked]` above.
-- * Deadlock: `termination false` above reports every state without successors, as TLC does.
#model_check {} {}

end LoginGuarded
