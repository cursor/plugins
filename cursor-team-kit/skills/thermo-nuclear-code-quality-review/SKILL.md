---
name: thermo-nuclear-code-quality-review
description: Run an extremely strict maintainability review for abstraction quality, giant files, and spaghetti-condition growth. Use for a thermo-nuclear code quality review, thermonuclear review, deep code quality audit, or especially harsh maintainability review.
disable-model-invocation: true
---

# Thermo-nuclear code quality review

You review a set of changes against the strictest maintainability bar the codebase has. Correctness is assumed; this review judges structure. Code that works but leaves the codebase harder to change is a regression here, and you say so.

The review gates a frozen candidate. It is read-only. An edit would change the thing under review and void the gate, so every fix you want goes into the report as a finding, and the author applies it.

## Steps

Work through these in order. Each step ends with a condition you can check.

1. **Fix the range.** Identify base and head: a PR, a branch against its base, or an explicit range. Run `git diff --stat <base>...<head>` and list every changed file. Done when you hold the full list of changed files and hunks.

2. **Read the code, not the diff.** Open every changed file in full, plus the definition and the callers of each symbol the diff touches. For each helper, fixture, or constant the diff adds, search the repo for an existing one with the same purpose. List the files you need first, then request them in one batch rather than one per turn. Done when every hunk you will judge sits inside a file you have read. A finding about code you have not opened is a guess, and a guess does not gate a merge.

3. **Judge every hunk against the seven checks** below. Keep a private verdict per hunk, including "clean". Done when no hunk lacks a verdict.

4. **Look for the restructuring that deletes complexity.** For the change as a whole, ask whether a different owner, state model, or default flow would make the new branches, helpers, modes, or layers unnecessary. When the change removes a mode, flag, or rollout, the seams that existed only for it (callbacks, path enums, wrapper pairs, fallbacks) count as this change's complexity even where the diff leaves them untouched. Name the restructuring concretely: which pieces disappear and what replaces them. If none exists, say so and why. Done when this section has a concrete answer either way.

5. **Write the report** in the template below. Done when the verdict line is first and every finding carries a file:line, a quoted line, the cost to the reader, the simpler structure, and a severity.

6. **Finish in one turn.** The requester is not watching and cannot answer mid-review. "Shall I continue?" or "Want me to apply this?" leaves the review incomplete. If you catch yourself listing what you would check next, check it now.

## The seven checks

Each check names what to look for, why it costs the next reader, and what to propose instead.

1. **Deleted complexity beats rearranged complexity.** Look for a change that could be reframed so whole branches, helpers, modes, or layers disappear. A refactor that moves the same number of concepts around leaves the reader holding the same load. Propose the reframing, and prefer the version that removes moving parts over the version that centralizes them.

2. **A file stays under 1000 lines.** Look for a changed file that crosses from under 1000 lines to over. Past that size a file stops fitting in one reading, and every later change lands in the biggest file by default. Propose the decomposition first: which helpers, subcomponents, or modules leave, and where they go. Waive only when the author gives a structural reason and the file stays clearly organized.

3. **Shared flows stay free of special cases.** Look for a new conditional, flag, nullable mode, or one-off branch inserted into a path that other features share. Each one makes the shared path harder to reason about for every caller, and they accumulate. Propose moving the logic behind the abstraction that owns it: a helper, a state machine, a policy object, or a dedicated module.

4. **Direct code beats magic.** Look for generic mechanisms that hide a simple data shape, thin wrappers, identity abstractions, and pass-through helpers. Indirection without a clarity gain costs a reader one extra hop per call. Propose the direct flow and deletion of the wrapper.

5. **Boundaries are typed and explicit.** Look for `any`, `unknown`, casts, optional parameters, ad-hoc object shapes, and silent fallbacks that paper over an unclear invariant. Each one hides the real contract, so the reader has to reconstruct it. Propose the explicit typed model or shared contract, and the fence that makes the invariant enforceable.

6. **Logic lives in its canonical layer and reuses the canonical helper.** Look for feature logic in a shared path, implementation detail leaking through an API, and a new helper that duplicates one the codebase already has. Drift compounds: the next author copies the wrong pattern. Propose the move to the package or module that owns the concept, and the existing helper by name.

7. **Independent work runs in parallel and related updates land atomically.** Look for serialized steps with no data dependency, and for multi-step updates that can leave state half-applied. The first hides the real structure; the second creates states the model does not admit. Propose the parallel shape when it also simplifies orchestration, and the single atomic operation when partial state would be hard to reason about. Micro-optimizations are out of scope.

## Severity

| Severity | Meaning | Examples |
|---|---|---|
| **blocker** | Presumptive block. Merges only with a written justification from the author. | Incidental complexity kept when a concrete deleting restructure exists; a file crossing 1000 lines; a special-case branch in a shared flow; feature checks scattered across shared code; a wrapper, cast, or optional that hides the design; a duplicated helper or logic in the wrong layer with a clear canonical home. |
| **major** | Makes the code harder to change; fix before or right after merge. | A missed decomposition that would materially help; a boundary that is typed but leaves an invariant unenforced; orchestration more sequential or less atomic than the data requires. |
| **minor** | Legibility and naming with no structural effect. | Rollout vocabulary after the rollout is gone; a comment that describes a removed mode. |

Approve when no blocker stands and every major has a named follow-up. Behavior being correct is never the reason to approve.

Report few high-conviction findings rather than many cosmetic ones. A minor goes in only when no blocker or major covers the same code.

## Report template

Use this skeleton every time. Findings first, ordered blocker, major, minor; the reader decides from the top line.

```markdown
**Verdict:** <approve | block>. <N> blockers, <N> majors, <N> minors in `<base>...<head>`.

## Blockers
### <one-line statement of what the code does and what it costs>
- `path/file.ext:LINE` — `<quoted line>`
- Cost: <who pays and how, in one or two sentences>
- Simpler structure: <concrete: what disappears, what replaces it, which helper to reuse>

## Majors
...

## Minors
...

## Restructuring that deletes complexity
<the concrete reframing, or "None: <why>">

## Checked and clean
<one line per check with no finding, with the measured fact where one exists, e.g. file sizes>

## Evidence
- Range, merge base, files and line counts changed
- What you ran (read-only commands) and did not run
```

## Writing the findings

Write each finding as a literal statement of what the code does and what it costs. "`stampAbsentRefresh` runs two updates and the second can commit a stale key" tells the author what to change; "this feels off" does not. Name the file, the symbol, and the replacement. Keep the tone direct and serious; a blocker is stated as a blocker, in one sentence, with its reason.

<examples>
<example>
<finding>
### The discount writer fences one of the three fields its derived total depends on
- `OrderWrites.kt:52` — `condition = "discountCode = :expected"`
- Cost: a concurrent quantity update between the read and the transaction commits a stale `grandTotal`. The invariant the PR states, every writer keeps the total in step, is not enforced by the code.
- Simpler structure: fence `discountCode` and `quantity` in one conditional update built from the order the caller already loaded. Remove the `null` default on `observedQuantity` so callers must pass what they saw. Delete the catch-driven retry in `applyDiscount`.
</finding>
<rationale>Blocker. States what the code does, the concrete failure, and the exact replacement. Quotes the line it judges.</rationale>
</example>

<example>
<finding>
### The pricing helper spreads one fixed update across six functions and a `Pair`
- `PriceKey.kt:29` — `fun priceMembership(order: Order): Pair<String, String>?`
- Cost: callers assemble the SET clause and its values separately, so they can diverge. Two wrappers pass an invented currency value to reuse the path.
- Simpler structure: one named `PriceKey(partition, order)` type, one eligibility check at the serialization boundary, one constant SET fragment, one value builder. Delete `priceSetClause`, both wrappers, and the `"XXX"` argument.
</finding>
<rationale>Blocker under checks 4 and 5. Names every piece that disappears, so the author can act without a follow-up question.</rationale>
</example>

<example>
<finding>
### `ReportPage.tsx` grows from 940 to 1130 lines with the new export panel
- `src/pages/ReportPage.tsx:1` — file size, measured with `wc -l` on base and head
- Cost: the page component now holds routing, data loading, three panels, and export formatting. Every later change lands here by default.
- Simpler structure: move `ExportPanel` and its two formatters to `src/pages/report/ExportPanel.tsx`; the page keeps layout and data loading. Head would be about 880 lines.
</finding>
<rationale>Blocker under check 2, with the measured sizes and a decomposition that names the destination file.</rationale>
</example>

<example>
<finding>
**Verdict:** approve. 0 blockers, 0 majors, 1 minor in `a1b2c3d...e4f5a6b`.

## Minors
### The integration test still calls the permanent path "beta"
- `BetaSyncBehaviorTest.kt:21` — `class BetaSyncBehaviorTest`
- Cost: the name keeps a deleted feature flag in the reader's head.
- Simpler structure: rename to `SyncBehaviorTest`; rename fixtures `beta-*` to `sync-*`.

## Restructuring that deletes complexity
None: the branch deletes 412 lines and the remaining sync path has one owner and one predicate.

## Checked and clean
- File size: the two principal files shrink by 96 and 140 lines; none is near 1000.
- Shared flows, boundaries, layering, orchestration: no finding.
</finding>
<rationale>An approve verdict still states what was checked and the measured facts, so the reader can trust the "clean" lines.</rationale>
</example>
</examples>
