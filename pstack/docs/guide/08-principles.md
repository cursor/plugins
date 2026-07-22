# The principles change work decisions

pstack has 21 principle skills. A playbook defines the steps for a task. The principles change the decisions inside those steps.

For every multi-step task, `/poteto-mode` puts "read the Principles section in full" first in the todo list. For each principle the agent applies, the agent reads the full skill. In the final reply, the agent names each applied principle and the decision it changed.

You do not need to invoke all 21 principles. Their names give you a precise way to redirect the work.

## Core principles set scope and design choices

The nine core principles decide how much to build and when to reconsider the design:

- [Laziness Protocol](../../skills/principle-laziness-protocol/SKILL.md) prefers deletion and the smallest change that solves the problem.
- [Foundational Thinking](../../skills/principle-foundational-thinking/SKILL.md) chooses the core data structures before logic.
- [Redesign from First Principles](../../skills/principle-redesign-from-first-principles/SKILL.md) treats a new requirement as a base assumption.
- [Subtract Before You Add](../../skills/principle-subtract-before-you-add/SKILL.md) removes unused or redundant code before adding structure.
- [Minimize Reader Load](../../skills/principle-minimize-reader-load/SKILL.md) reduces layers, hidden state, and needless indirection.
- [Outcome-Oriented Execution](../../skills/principle-outcome-oriented-execution/SKILL.md) moves planned rewrites toward the target design. It avoids code that only keeps intermediate phases compatible.
- [Experience First](../../skills/principle-experience-first/SKILL.md) favors the user result over implementation convenience.
- [Exhaust the Design Space](../../skills/principle-exhaust-the-design-space/SKILL.md) builds two or three competing prototypes when a new design has no codebase precedent.
- [Build the Lever](../../skills/principle-build-the-lever/SKILL.md) creates the smallest script, generator, check, or shared skill that performs or proves nontrivial work.

## Architecture principles set code structure

The six architecture principles decide where state, validation, and compatibility belong:

- [Model the Domain](../../skills/principle-model-the-domain/SKILL.md) encodes repeated rules in one data structure.
- [Boundary Discipline](../../skills/principle-boundary-discipline/SKILL.md) validates external data at the boundary and trusts internal types.
- [Type System Discipline](../../skills/principle-type-system-discipline/SKILL.md) makes invalid states hard to represent.
- [Make Operations Idempotent](../../skills/principle-make-operations-idempotent/SKILL.md) makes retries converge on the same result.
- [Migrate Callers Then Delete Legacy APIs](../../skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md) migrates every caller and removes the old API in the same refactor.
- [Separate Before Serializing Shared State](../../skills/principle-separate-before-serializing-shared-state/SKILL.md) removes shared writes before adding coordination.

## Verification principles define proof

The three verification principles require evidence:

- [Prove It Works](../../skills/principle-prove-it-works/SKILL.md) checks the real artifact before `/poteto-mode` reports success.
- [Fix Root Causes](../../skills/principle-fix-root-causes/SKILL.md) confirms the failure mechanism before the agent changes code.
- [Sequence Work into Verifiable Units](../../skills/principle-sequence-verifiable-units/SKILL.md) finishes and checks one small unit before the next.

## Delegation principles protect context and progress

The two delegation principles control parallel work:

- [Guard the Context Window](../../skills/principle-guard-the-context-window/SKILL.md) sends large reads to subagents and keeps short findings in the main chat.
- [Never Block on the Human](../../skills/principle-never-block-on-the-human/SKILL.md) keeps reversible work moving without a permission pause.

## The meta principle turns repeated advice into checks

[Encode Lessons in Structure](../../skills/principle-encode-lessons-in-structure/SKILL.md) replaces repeated prose instructions with a lint rule, check, script, or metadata field.

## A principle name changes the next decision

A principle name is a direct instruction. This prompt asks the agent to remove old structure before editing:

```text
Use Subtract Before You Add.
1. Delete the obsolete adapters.
2. Design the remaining path.
```

This prompt rejects a compile-only success claim:

```text
Apply Prove It Works.
1. Run the real import flow.
2. Show the written records.
3. After both checks pass, report success.
```

This prompt keeps parallel agents isolated:

```text
Apply Separate Before Serializing Shared State.
Give each attempt its own worktree instead of adding a lock.
```

The name works because it points to a complete rule. The agent still has to state which decision the rule changed.

Next: [Create and test your own pstack skills](./09-make-it-yours.md).
