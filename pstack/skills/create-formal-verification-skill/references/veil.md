# Verify a model with Veil

[Veil](https://github.com/verse-lab/veil) is a Lean 4 library for state machines and protocols. In a Veil file, a model checker explores every state of a small instance, as TLC does. An SMT check in the same file can then prove a rule for every size of the model. This file shows how to set up a project, write the model, run each check, and read the results.

## Contents

- [Pick the check](#pick-the-check)
- [Set up the project](#set-up-the-project)
- [Write the model](#write-the-model)
- [Run the checks](#run-the-checks)
- [Read the results](#read-the-results)
- [Prove a rule for every size](#prove-a-rule-for-every-size)
- [Show that each check can fail](#show-that-each-check-can-fail)
- [Worked examples from the statechart corpus](#worked-examples-from-the-statechart-corpus)
- [What a pass covers](#what-a-pass-covers)

## Pick the check

| Command | What it does | A pass covers |
| --- | --- | --- |
| `#model_check` | Explores every reachable state of one finite instance and checks each `invariant` in each state, as TLC does. | That instance |
| `#check_invariants` | Asks the SMT solver cvc5 whether the `invariant` clauses hold in every initial state and whether every action keeps them. | Every instance of the model |
| `sat trace` | Asks cvc5 whether a run of a given shape exists in some instance. | A run of that shape exists |
| `#temporal_check` | Checks `temporal` properties, such as "the player stops at last", on one finite instance. | That instance |

Start with `#model_check` on the smallest instance that lets every action run. Add `#check_invariants` when the rule must hold at every size, such as for any number of nodes, sessions, or retries.

## Set up the project

Keep the model in its own Lake project, such as `verify/`, so that the product build does not need Lean.

1. Install `elan`, the Lean toolchain manager, and load its environment:

	```sh
	curl -fsSL https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh -s -- -y --default-toolchain none
	. "$HOME/.elan/env"
	```

	Veil's build also needs `clang` and Node.js with `npm`. The Build section of [Veil's README](https://github.com/verse-lab/veil/blob/57447722e7f25f06c75cff8735d10d41697afc14/README.md#build) lists the packages for each platform.

2. Write `verify/lakefile.toml`. Pin Veil to a commit, so that every run uses the same version. The worked examples ran against the commit below.

	```toml
	name = "verify"
	defaultTargets = ["Verify"]

	[[require]]
	name = "veil"
	git = "https://github.com/verse-lab/veil.git"
	rev = "57447722e7f25f06c75cff8735d10d41697afc14"

	[[lean_lib]]
	name = "Verify"
	globs = ["Verify.+"]
	```

3. Write the toolchain of the pinned Veil commit to `verify/lean-toolchain`. For the commit above, the file holds `leanprover/lean4:v4.35.0`. When you move the pin, copy Veil's `lean-toolchain` at the new commit.
4. Add `.lake/` to `verify/.gitignore`.
5. Run `lake update` in `verify/`, and commit `lake-manifest.json`. The manifest pins every dependency.

The first `lake lean` or `lake build` compiles Veil and its dependencies. On a 2-core Linux machine, that took 11 to 14 minutes and used 2 GB in `.lake/`, plus 3 GB for the toolchain. Later runs reuse that work.

## Write the model

Write each model in its own file under `verify/Verify/`. Start the file with these lines, because `#model_check` compiles its checker only in a file that uses Lean's module system:

```lean
module

public import Veil
```

Write the model between `veil module Name` and `end Name`:

- Declare the state with `individual` for one value, `relation` for a set as a `Bool`-valued function, `function` for a map, and `enum` for named states. Then write `#gen_state`.
- Set the initial state in `after_init { ... }`.
- Write one `action` for each step that the code takes in one indivisible piece, and use the code's names. `require P` is the guard. A field that the action does not assign keeps its value.
- Write each rule as `invariant [name] P`. An undeclared capitalized name, such as `R` in `rmState R = committed`, ranges over every value.
- Add `termination false` to report a state with no next step as a deadlock, as TLC does by default.
- Write `#gen_spec` after the declarations, and then the checks.

[`veil/Corpus/TwoPhase.lean`](veil/Corpus/TwoPhase.lean) shows each of these. Veil's [DSL reference](https://github.com/verse-lab/veil/blob/57447722e7f25f06c75cff8735d10d41697afc14/docs/DSL-Reference.md) covers the rest of the language.

To translate an existing TLA+ spec, follow Veil's `tla-to-veil` skill. After `lake update`, it is at `.lake/packages/veil/.agents/skills/tla-to-veil/SKILL.md`. It maps each TLA+ construct to Veil, lists the traps, such as simultaneous updates and `CHOOSE`, and says how to compare the result with TLC. Where that skill runs `lake env lean`, run `lake lean` instead, for the reason in the next section.

## Run the checks

From `verify/`, run the checks of one file:

```sh
lake lean Verify/Checkout.lean
```

Lean elaborates the file, runs every check in it, and prints the results. A violation is an error, so the command exits with 1. Use `lake lean`, not `lake env lean`. `lake env lean` does not load cvc5, so Lean aborts when a check needs it. `lake build` runs the checks of every file in the library.

Each run elaborates the file and builds a compiled checker. On a 2-core machine, each worked example took 11 to 42 seconds, where TLC takes about 1 second. For a small model, `#model_check interpreted` skips the compiled checker. `TwoPhase.lean` then took 9 seconds instead of 21.

## Read the results

| Output | Meaning |
| --- | --- |
| `✅ No violation (explored N states)` | No reachable state breaks an `invariant`. `N` counts distinct states, like TLC's `distinct states found`. It covers every reachable state only when the check sets no `maxDepth`. |
| `❌ Violation: safety_failure (violates: p)` | A reachable state breaks `p`. The trace below it lists each state and the action, with its arguments, that led there. |
| `❌ Violation: deadlock` | A reachable state has no next step, and the `termination` clause does not hold in it. |
| `❌ Violation: assertion_failure` | An `assert` failed, or a `require` failed in a called procedure. |
| `✅ No liveness violation (checked N properties, ...)` | Every run of the instance satisfies the `temporal` properties. |
| `✅ Satisfying trace found` | A `sat trace` found a run. The report shows the instance and each state. |
| `p ... ❌` under an action, from `#check_invariants` | The invariants do not show that this action keeps `p`. `Counterexample (WP)` shows a pre-state that satisfies every invariant. `Counterexample (TR)` also shows the post-state that breaks `p`. |

Tell each counterexample to the reader as steps in the code's words. For `TwoPhase.lean`: resource manager 1 prepares, the transaction manager records it and commits, resource manager 1 commits, and resource manager 0 aborts.

## Prove a rule for every size

A rule alone is seldom enough for `#check_invariants`. A state that no run reaches can satisfy the rule and then step to a state that breaks it. `#check_invariants` reports such a state as a counterexample. Add a helper invariant that rules the state out, and run the check again. Repeat until every check passes. [`veil/Corpus/TwoPhaseFixed.lean`](veil/Corpus/TwoPhaseFixed.lean) needs seven helper invariants beside `TCConsistent`.

- Keep `#model_check` in the file. When a new helper invariant is false, `#model_check` fails on the instance, so you do not chase counterexamples for a helper that cannot hold.
- When `#model_check` passes and `#check_invariants` fails, the counterexample is usually a state that no run reaches, and the helpers are too weak. The code has a bug only when a run reaches a state that breaks the rule itself. A reachable state that breaks a helper means that the helper is false.
- By default, Veil trusts cvc5. It closes each goal that cvc5 solves with `sorry`, and it warns `Trusting SMT solver for N goals`. Write `set_option veil.smt.trust false` after the imports, and Lean rebuilds each proof and checks it in its kernel. In `TwoPhaseFixed.lean`, Lean rebuilt the proofs of all 64 goals, and the warning went away. A goal that Lean cannot rebuild keeps its `sorry`, and Veil still warns.
- Add a `sat trace` that reaches the outcome you care about. It shows that the proof is not about a model in which nothing happens.
- When cvc5 cannot decide a goal, prove it in Lean. Veil's tutorial at `.lake/packages/veil/Examples/Tutorial/FloodSet.lean` ends with such a proof.

## Show that each check can fail

Break the model the way the rule guards against, and confirm that each check catches the break. Then undo the break.

- `#model_check` must report the violation. It stops at the first invariant that breaks, so it can report a helper invariant before the rule. In `TwoPhaseFixed.lean` with the seeded bug back in `TMCommit`, it reports `commit_needs_all_prepared` after 3 steps. To see the rule itself break, check the broken model without the helpers, as `TwoPhase.lean` does.
- `#check_invariants` must report `❌`. With the same bug, `commit_needs_all_prepared` fails for `TMCommit`. In `Counterexample (TR)`, the transaction manager commits while resource manager 1 is still `working`.

`set_option veil.violationIsError false in`, on the line above a `#model_check`, reports a violation as information, and `lake lean` then exits with 0. The worked examples use it so that the files with seeded bugs build. A verify skill must not use it, because its check must fail on a violation.

## Worked examples from the statechart corpus

[`veil/`](veil/) is a Lake project with Veil translations of six specs from the [`/statechart`](../../statechart/SKILL.md) test corpus. Above each Veil translation, the files quote or summarize the TLA+. The comment above each `#model_check` maps it to the spec's TLC config. TLC, from tla2tools 1.7.4, and Veil agree on every rule and every count:

| Spec | TLC (tla2tools 1.7.4) | Veil |
| --- | --- | --- |
| `TwoPhase` | `TCConsistent` breaks in 5 steps. 76 states. | The same |
| `TwoPhaseFixed` | 56 states | 56 states. `#check_invariants` proves `TCConsistent` for any number of resource managers. |
| `MediaPlayer` | `LoudWhenStopped` breaks in 1 step. 12 states. `EventuallyStops` holds in the first state. | The same |
| `MediaPlayerFixed` | 11 states | 11 states |
| `DieHard` | `NotSolved` breaks in 6 steps. 16 states. | The same |
| `LoginGuarded` | 8 states | 8 states |

For a spec with a seeded bug, the count covers the whole state space. TLC ran with `-continue`, and Veil ran without the rule that breaks. With 5, 6, 7, and 8 resource managers, `TwoPhaseFixed` has 8,832, 50,816, 296,448, and 1,745,408 states in both tools.

To run the examples, copy `veil/` to a folder outside the skill, and run `lake build` there. The build runs every check. A build inside the skill folder leaves a `.lake/` folder there.

## What a pass covers

- `#model_check` covers the instance that you give it, and nothing larger.
- `#check_invariants` covers every instance of the model, and only the model. It does not cover code that the model leaves out, so the generated skill still needs its coverage record and its sync commit.
- Lean checks each proof only when `veil.smt.trust` is `false` and Veil prints no `Trusting SMT solver` warning. Otherwise the proof also trusts cvc5.
