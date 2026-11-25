---
name: workflow-verification
description: Design and verify changes whose correctness depends on sequences of steps, turns, handoffs, retries, recovery, or bounded context. Use when planning or changing stateful services, resumable jobs and LLM orchestration; isolated pure functions and wording edits do not require this workflow.
---

# Workflow verification

Extend [statechart](../statechart/SKILL.md) into an agent-guided workflow linter:
trace contracts through real producers and consumers, identify broken transitions,
and select executable checks that can demonstrate them. Use it to review an existing
workflow or guide an authorized implementation. A review request stays read-only.

```text
/workflow-verification review the retry queue: what survives a restart,
what may repeat, and what permits the next attempt?
```

Establish shared contracts before implementation, then verify that the actual workflow
reaches its intended outcome across entry, persistence, retirement and continuation.
Scale the work to the changed contract and concrete risks.
Use the owner's existing test commands and CI; this skill grants no additional permissions,
native inference budget, dependency changes or live-system access.

## Define observable phase contracts

Before editing, identify the useful outcome, legitimate waiting/stopping conditions, and
state that must survive the next step. Trace the real caller through its handoff and
successor, including the point where a model, worker, service or process returns.

Distinguish transport success, parsed output, persisted progress and completed work.
Name what makes progress: newly acquired necessary information, a resolved dependency,
a completed assessment or another task-specific outcome. Log growth and successful calls
alone do not establish it. State which permissions, revisions and original evidence must
remain binding.

For each affected phase, make its contract explicit in the existing design or plan:

- Entry inputs and prerequisites due now, including current permissions.
- Allowed actions and required outputs within the phase's scope.
- Completion predicate and the evidence or judgment needed to establish it; name what
  unit, attempt, stage or cycle has completed and which consumer may act on that result.
- Blocking gaps versus future obligations and nonblocking limitations. State when each
  remaining duty becomes due, who resolves a blocker and which event can unblock it.
- Successor behavior, information that must carry forward, and permitted waiting,
  reopening or invalidation events. Completion alone does not authorize continuation.

For changed defaults or overrides, name the target and adoption boundary: this item,
later phases or future cycles. For recovery or correction, state what identity and saved
work survive, which effects may repeat and what would constitute a new attempt.

Audit overloaded terms such as `complete`, `ready`, `accepted`, `valid`, `resolved` and
`stopped` at their actual callers. Ask: what object, phase, scope and revision does this
status describe, and what decision does it permit? Split independent facts or use scoped
predicates when one status answers different questions. Input can be understood while
execution remains due; accepted evidence can remain valid while permission is paused;
a process can return while cleanup remains uncertain. Keep deterministic checks separate
from judgments that require interpretation. Naming alone is insufficient: consumers and
tests must implement the distinction using the shared contract below.

## Use one definition for each contract

Before designing a change, locate the owner and executable definition of each affected
input, state, transition and completion rule. Trace its producers and consumers, including
initial creation, dispatch/admission, model schemas and guidance, persistence readers,
export/restore and continuation where applicable. Record the relevant definitions and
consumers in the existing plan; a small table is useful when the relationships are unclear.
Keep this investigation scoped to the affected boundaries.

Reuse one maintained semantic definition per contract. Make equivalent consumers use
the same typed rules, schema or canonical reader; derive wire schemas and guidance from
it where practical. Do not add a second policy implementation in a launcher, adapter,
prompt or recovery path. If a process/language boundary prevents direct reuse, use an
explicit versioned interface and conformance checks against that definition. Consolidate
duplicated interpretations in the changed boundary instead of adding another list or
special-case exception. This does not require a central framework or a universal schema.

Keep different meanings explicit, including work purpose versus scientific/business
stage. A consumer must accept the producer's supported representation; additional
authorization or phase prerequisites are separate checks,
not invented storage requirements. Preserve those checks. Identify future dependencies
during planning and satisfy them before their dependent operation, not before the stage
whose purpose is to create them.

Normalize supported legacy/storage alternatives at the owning reader. Reuse that reader
rather than reconstructing its semantics from SQL or prose in another consumer. Preserve
captured contract meaning across retries and recovery; make incompatible changes explicit
and prevent older consumers from silently interpreting new state under old rules.
For model workflows, bind host-known identity, scope and phase in host code; request
judgments and necessary evidence/reference selections from the model. Validate those
selections without treating supplied evidence as personally inspected evidence.

## Choose executable checks

Select the smallest set that exercises the affected failure paths:

- **Phase distinctions.** Test relevant cases where independent facts differ: faithful
  interpretation with future work still due; a scoped limitation without a blocking
  contradiction; valid saved input while execution is paused; or a terminal result with
  unknown cleanup. Assert both the permitted progress and the still-forbidden action.
  Pair these with genuinely blocking cases so the distinction cannot silently weaken
  prerequisites. Choose cases from the changed boundary, not a universal checklist.
- **Producer/consumer agreement.** Build a compact acceptance matrix from supported
  payload/storage alternatives and observed failures. Drive actual public producers
  through their consumers, including recovery export/restore when affected; hand-seeded
  database rows alone do not establish compatibility. Assert intended outcomes and
  invalid-state rejection independently of the shared implementation. Expectations
  derived only from the same rule table cannot detect a shared wrong rule.
- **A complete lifecycle test.** Drive the real public entry, persistence/application,
  retirement and next claim or resume. Fake the external boundary when necessary. Do
  not give a fake worker extra checkpoints, acknowledgments, cleanup or retries that
  the real client does not perform. For an introduced wait or park, exercise the actual
  authorized reopening event and fresh claim, including restored state when persistence
  matters. Reaching the stopped state alone does not verify its continuation. Assert the
  successor's state and capabilities. When defaults, bindings or capabilities must carry
  into a later cycle, exercise that cycle's actual dependent operation with its own inputs;
  creating its stage rows or substituting a synthetic answer does not establish readiness.
- **Sequences and interruptions.** Exercise the relevant action combinations: A → B → A,
  correction after acceptance, pause during a handoff, restart with saved work, replay,
  permission withdrawal, or cancellation. Start with concrete regressions; use generated
  stateful/property tests when combinations or sizes make hand-picked cases insufficient.
- **Payload and history pressure.** Vary the dimensions that compete for a budget:
  labels, candidates, historical entries, fixed instructions and nested encoding. Assert
  both the real encoded bound and the declared decision-critical information that must
  remain usable. Check long histories, honest omissions, recoverable originals and the
  distinction between stored, offered and actually inspected information.
- **Provider boundary contracts.** For LLM/API adapters, inspect the actual compiled wire
  schema, instructions, selected model/effort and capabilities. Enumerate every advertised
  disposition/action and supported payload branch, then trace each through the real consumer,
  including valid non-success responses. Remove unsupported advertised branches or implement
  their continuation; a fake that always returns success does not verify that agreement.
  Host schema validation alone does not establish provider compatibility. Use an authorized
  small native canary when offline checks cannot establish a changed external contract; require the complete
  affected lifecycle before expanding dispatch. Record its cost and limits.
- **Failure replay.** Turn demonstrated failures into regression fixtures at the boundary
  that exposed them. Preserve meaningful state, sizes and ordering; sanitize unrelated
  private data. A fixture should fail for the demonstrated defect, not merely match the
  implementation's fields or wording.

Stateful/property tests can use Hypothesis or an existing equivalent. New tooling is not
mandatory when the owner's current checks can exercise the contract adequately.

## Use the statechart skill when it adds value

Consider the bundled [statechart skill](../statechart/SKILL.md) when ordering, recovery, concurrency, ownership
or loop questions leave meaningful uncertainty and a tractable model would clarify it.
A short bug path already established by a decisive executable reproduction does not require
formal modeling. Read the statechart instructions when applying it. Model relevant
distinctions, such as retained versus visible context, current versus stale revisions,
and clean completion versus uncertain interruption. Express safety and progress rules
explicitly. Do not hide a possible loop inside a single chart label.

Replay every predicted bug path against the real implementation. A model/counterexample
is a hypothesis about the code until that correspondence is established. Record omitted
behavior and exploration bounds; a small state model does not establish payload handling,
provider behavior or scientific correctness. Use payload and lifecycle tests alongside it.

## Verify, review and report proportionally

Run relevant checks and the owner's required integration checks. Verify ordinary installed
behavior when import/package boundaries change. After a fix, rerun affected paths; repeat
unchanged broad checks only when changes or unresolved risks justify them.

Follow the owner's independent review requirement and resolve confirmed findings. Report
which boundary and sequences actually ran, their outcomes, and remaining unknowns.
For each finding, give the source location, violated contract, triggering sequence,
observed result (or clearly labeled hypothesis), and smallest correction. Distinguish
confirmed defects from untested concerns. If no defect is supported, say so and state
the checked scope; do not treat unexecuted checks as passing. Keep
software correctness, workflow usefulness, scientific quality and resource improvement as
separate claims. Resource improvements need an explicit baseline, equivalent work and output
checks for behavior-preserving changes, and measurements of both quality and cost for intended
outcome changes. Use the owner's optimization process and include failed and incomplete
attempts. Do not claim savings from a smaller unfinished workload.

A skill guides check selection. Executable tests and runtime observations enforce or test
the declared contracts; neither a skill name nor a large passing test count proves them.
