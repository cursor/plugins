---
name: architect
description: "Sketch types, signatures, and module structure before code, then stay in the loop while implementation fills in. Use for /architect, 'architect this', 'design this', or non-trivial work where jumping to code would lock in the wrong shape."
---

# Architect

Design before implementing. Sketch types, function signatures, class shapes, and module boundaries with `not implemented` bodies and pseudocode. Synthesize across multiple model perspectives, then fill in code against the chosen sketch. If implementation proves the sketch wrong, throw it out and redesign.

## Start

Open a todolist with one entry per phase before starting.

1. Ground
2. Sketch
3. Agree
4. Implement
5. Scrap

## When a playbook step calls this skill

Some callers delegate the implementation themselves: Bug fix step 3, Feature step 2, Refactoring
step 3, Perf issue step 3, the figure-it-out skill's Phase B, and the no-comments skill.
For such a caller, stop after Phase C and return the synthesized design package, meaning the sketch,
the rationale, and arena's `synthesis.md`. The caller's implementation delegate is Phase D, briefed
with the sketch as its contract. Do not implement the design as well. Phase E still holds. The
caller watches that delegate's diff for the scrap tells and comes back to Phase B when they appear.
Mark Phase D and Phase E `skip: caller implements` in this skill's todolist. Invoked directly
(`/architect`), run all five phases.

## Phase A: Ground the problem

Build a real mental model of every system the new code touches. Run the **how** skill over the relevant subsystems.

Naming a file isn't grounding. Produce the traced model `how` prescribes. If the design redefines ownership or layering, also run the **why** skill on the existing shape so the rationale becomes a constraint, not a guess.

**Reuse grounding the caller already holds.** A `how` traced model, and a `why` constraint set,
produced this session over the same subsystems satisfy Phase A when no file they cite has changed
since. Check that with `git status` and `git diff` against the commit they were read at. When the caller keeps a run record, its `run-record.py ground check --scope <paths>` does this per path and names the grounding to reuse. Run `how`
again only on subsystems the earlier model does not cover or whose files changed. The rationale
names which grounding was reused and where it came from. A model that only names files is not
grounding, whoever produced it.

Skip Phase A only when the work is genuinely greenfield with no surrounding system to integrate.

## Phase B: Sketch

Run the **arena** skill with the design-sketch task and the Phase A grounding artifacts. Pass `references/runner-prompt.md` as each runner's prompt. Each candidate produces a design package shaped per `references/rationale-template.md`.

Use your configured `architect-runners` (defaults the `panel` pool (see `runtime/roles.md`)).
Pass that list to arena as its runner roster. It overrides `arena-runners` for this invocation.
Resolve aliases and rejected entries using arena Phase A. The rationale names the width that ran.

Design it twice. Require at least two structurally distinct candidates before synthesis, even when the first looks sufficient. This is the **exhaust-the-design-space** principle skill made concrete. Whole-shape alternatives, not point fixes inside one shape. Stances do not produce structural distinctness on their own. Before spawning, name the structural starting point for each runner (for durable state, say, a store row taken by compare-and-swap, a filesystem marker, per-actor ledgers merged at read) and assign one per runner. Four stances on one shape are one candidate.

**Phase B produces sketches, not running code.** A candidate is screened on shape: the usage
sketch, the types, the module map, the rationale. It is not run, benchmarked, or tested against a
suite, and a rubric criterion that could only be scored by running it does not belong in this phase.
Runtime proof is Phase D's job, against the one synthesized base. Requiring run output from every
candidate multiplies implementation cost by the fan-out width, which is the cost this phase split
exists to avoid. `prove-it-works` governs Phase D; `exhaust-the-design-space` governs Phase B.

The exception is one specific empirical question the sketches genuinely disagree on and no sketch can
settle. Run a single narrow experiment on that question alone, per the Prototype playbook, and hand
the answer to every candidate. That is one experiment, not one implementation per candidate.

Screen every candidate against [`references/design-red-flags.md`](references/design-red-flags.md) before synthesis. Assume the next contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles. Prefer the design where a change that looks right from one file is right for the whole repo.

Compare viable candidates on interface depth. Prefer the design that hides more complexity behind a smaller, simpler public surface. A rich interface can keep call chains short by concentrating capability instead of scattering it across layers.

Arena returns one synthesized design package. The synthesis decision populates the rationale's "Synthesis decision" section.

## Phase C: Agree (opt-in)

Default: proceed directly to implementation with the synthesized design. No human checkpoint.

Opt in to a checkpoint when the invoker explicitly asks: "/architect with checkpoint," "stop and show me before implementing," or similar. Then surface the synthesized design and pause for sign-off.

The synthesis can ship as its own commit either way, as the "scaffold first" mode of the **foundational-thinking** principle skill. Planned and scoped breakage during fill-in is fine, per the **outcome-oriented-execution** principle skill. For adversarial pressure on the design before implementing, run the **interrogate** skill on the synthesized sketch.

If the human pushes back on the shape (in a checkpoint or after the fact), treat that as Phase A evidence. Re-ground and re-run Phase B before writing more code.

## Phase D: Implement against the sketch

Replace `not implemented` bodies with code, pseudocode with logic. The synthesized sketch is the contract.

Deviations from the sketch are signal worth surfacing, not friction to absorb silently. If a function needs a parameter the sketch didn't anticipate, ask whether the sketch was wrong, the requirement was missed, or the implementation is overreaching.

## Phase E: Scrap when the architecture is wrong

If implementation keeps producing friction the sketch can't absorb, throw the sketch out. Don't bolt fixes onto a wrong design, per the **redesign-from-first-principles** and **fix-root-causes** principle skills.

The signal is a *pattern*, not single instances. Tells:

- The same shape of workaround appearing repeatedly across unrelated code.
- Multiple unrelated edge cases that all need special-case branches.
- Types that need escape hatches (`any`, casts, optional fields always set in practice) to compile.
- The "we need a lock" reflex when the sketch said the state wasn't shared.
- Callers having to know the abstraction's internal rules to use it.
- Two or more independent Phase D deviations of the same shape across the implementation.

Use judgment. A few edge cases don't condemn an architecture. Some problems are legitimately complex. Complexity in the data is not complexity in the design.

When you scrap:

1. Re-run the **how** skill over what's been built.
2. Redesign as if the new constraints had been day-one assumptions, per redesign-from-first-principles.
3. Subtract before adding, per the **subtract-before-you-add** principle skill. The new sketch should be smaller than the old one before it grows.
4. Return to Phase B and re-run arena.

## Outputs

The caller's usage is written first and the type sketch derived from it. One file with new types and signatures for small changes. Module map plus type definitions for larger work. The rationale ships alongside, shaped per `references/rationale-template.md`, including the usage sketch and the synthesis decision.
