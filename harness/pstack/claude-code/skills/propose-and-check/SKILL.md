---
name: propose-and-check
description: "Search a design space with constraint logic, then model-check the survivors over time. Prolog (clpfd) enumerates and ranks every design that satisfies the constraints you declare. TLA+ checks how each survivor behaves. Every counterexample becomes a test on the real code. Use for /propose-and-check, or before fixing the rules of a system that has a few discrete choices, several rules that interact, and behavior over time."
disable-model-invocation: true
---

# Propose and check

In Claude Code, read [the Claude Code adapter](../../docs/harness/claude-code.md) once per session before you follow this skill. It maps the Cursor names in pstack skills to Claude Code.

This is the step before the code exists: search the design space under the author's rules. To verify code that is already written, use [`/create-formal-verification-skill`](../create-formal-verification-skill/SKILL.md).

Two tools, two questions. Prolog answers "which designs satisfy these constraints?", about a design that does not move. TLA+ answers "what can happen over time in this design?", about behavior. Neither tells you whether the constraints are right. The author does. The job is to show the author the options and the counterexamples, so the author does not have to imagine them.

## When to use

- A few discrete choices (who owns what, which rule applies in which phase, an order, a tier), rules about them, and then dynamics: phases, waits, retries, a partner who is down.
- You can say each rule in one plain sentence.
- The design space is too big to prototype by hand. When 2-3 prototypes are enough, follow [`/principle-exhaust-the-design-space`](../principle-exhaust-the-design-space/SKILL.md) instead; this skill is the same idea for a space you can only enumerate.

Skip it for feel, geometry, visuals, and timing polish. The model takes those as given facts. Skip it for a function with a small input space: enumerate every input on the real code. Skip it when the question is the shape of the code, not the rules of the system: use [`/architect`](../architect/SKILL.md).

## The loop

Open a todolist with one entry per step.

1. **Write the rules in the author's words.** One sentence each, each with a name. Mark each one static (about a design) or dynamic (about what happens over time). Static rules go to Prolog, dynamic rules to TLA+.
2. **Declare the variables and the static rules in Prolog.** Use `clpfd`. One predicate per rule, named like the rule, so a count can be reported per rule.
3. **Enumerate and count after each rule.** Report the cumulative count. A rule that removes nothing is vacuous or redundant, and the author should hear that. When nothing is left, report the smallest set of rules that conflict. That conflict is a decision for the author.
4. **Rank.** The cost function is what the author said they want, not what is easy to compute. Show the top N, how many designs share the best cost, and the cost terms.
5. **Write the dynamic part in TLA+.** Keep it small. The design is a constant: generate the `.cfg` from Prolog, so the two models cannot drift. Write each dynamic rule as an `INVARIANT`, a `PROPERTY` for liveness, or a reachability witness.
6. **Run TLC on the top N and on a sample of the rest.** The ranking never saw the dynamic rules, so a design low in the list can pass and a design at the top can fail. Run all survivors when TLC takes seconds. Read the results with [`/statechart`](../statechart/SKILL.md).
7. **Replay every counterexample on the real code.** Follow [`/tdd`](../tdd/SKILL.md): the path becomes a failing test, one step per action. If the path does not happen, the model is wrong until you show otherwise. Fix the model, not the test.
8. **Turn a missing rule into a constraint.** When a counterexample shows a rule nobody wrote, add it to the Prolog as a named hypothesis, and enumerate again. Compare the new survivors with the designs that passed TLC. They should match. A difference means the rule is too strict, too loose, or the model is wrong.
9. **Report to the author, with numbers.** See Report.

[`example/`](example/run.md) runs this loop on a toy: 256 layouts, 23 after four rules and symmetry breaking, 6 after TLC, and the same 6 after the fifth rule.

## Prolog pitfalls

- `forall/2`, `\+`, and `findall/3` do not keep constraints. `forall(member(V, Vs), V in 0..1)` leaves every `V` unconstrained (`inf..sup`), because `forall` is `\+ \+`. Recurse over the list with a named predicate. Use `findall` only on labeled terms.
- A `yall` lambda (`>>`) copies its free variables when it is called through `call/N`. `maplist([V]>>(V #=< Max), Vs)` posts nothing for `Max` if `Max` is unbound at that call. Use a named helper predicate.
- Reify a rule with `B #<==> (X #= 1)` and `sum(Bs, #=, S)`, then use `S` in other rules. Do not test a constraint variable with `==` or `->`: `( X #= 1 -> A ; B )` posts `X #= 1` and does not test it.
- Label every variable before you read an answer. Without `label/1` you read a residual constraint, not a design.
- To rank, enumerate and `keysort` (stable), or use `labeling([min(Cost)], Vars)` for the single best. Ties are common. Report the tie count, and do not present the order inside a tie as a ranking.
- Interchangeable things (two heroes, two lanes) make every design appear n! times. Break the symmetry with one fixed value, and report the count with and without it. The ratio checks your claim that they are interchangeable.
- Small spaces do not need a solver. Say so. The solver earns its place when the space is too big to list, or when a rule is a reified count.

## TLA+ pitfalls

- Model the dynamic part only. Do not re-derive what Prolog decided. Take it as a constant.
- TLC cannot compare a number with a string (`1 = "won"` is an error). Give every state value one type.
- Liveness needs fairness, and every behavior can stutter without it. Show the property failing once with the fairness removed, or you do not know it can fail.
- A reachability witness is an invariant that says the thing never happens. Its violation is the good news, and its trace is the witness. When it holds, the thing is unreachable, and that is a result to report.
- TLC stops at the first violated invariant. Later properties go unchecked for that design, and the state count it prints is partial.
- A state count that is identical for every design means the design is not reaching the model. Check one failing design by hand.
- State explosion: shrink the constants first, then drop variables no property reads, then add a `SYMMETRY` or a `VIEW`, and bound counters with a `CONSTRAINT`. Say which bounds the result depends on.
- Keep the two models in step. Generate constants from one source. Let both models state the same claim in their own terms, and expect them to agree. When they disagree, one is wrong.

## What the author decides

- **The constraints are the spec.** Prolog shows what they allow, not whether they are right. List them as sentences with their counts, so the author can strike one and see the count change.
- **What a counterexample costs to fix.** A rule you derive from a counterexample is a proposal. Show what it removes. Say what it forces, such as a phase that no longer needs both players.
- **Whether a counterexample is a bug.** Some are accepted by design, because a checkpoint or a retry already handles them. The author says which.
- **The weights in the cost function.**

Never weaken a rule or a property to make a design pass.

## Report

- The rules, in the author's words, with the count after each one.
- The top N, and how many designs share the best cost.
- A table of design, verdict, and states for each design TLC checked.
- Each counterexample as steps in the author's words, plus whether it reproduced on the real code.
- Each rule you added because of a counterexample, and what it cost.
- What the models leave out, and the commands that make every file again.

Used on the boss and arena rules of a small co-op platformer.
