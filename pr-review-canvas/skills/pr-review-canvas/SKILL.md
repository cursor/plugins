---
name: pr-review-canvas
description: >-
  Render a PR diff review as a Cursor Canvas that groups changes by
  reviewer importance, separates boilerplate from core logic, and
  highlights tricky or unexpected code. Use when reviewing a pull
  request, summarizing a diff for review, or when the user asks for a
  PR review canvas, diff walkthrough, or change-set overview.
---

# PR Review Canvas

Build a canvas that presents a PR diff reorganized for reviewer comprehension — not in file-tree order.

## Prerequisites

Read `~/.cursor/skills-cursor/canvas/SKILL.md` first. It contains the generation policy, design guidance, slop rules, self-check, and file-path conventions you must follow. The full component and hook surface is declared in `~/.cursor/skills-cursor/canvas/sdk/index.d.ts` and its sibling `.d.ts` files — read them to discover exact exports and prop shapes rather than guessing.

## Gather the diff

Expect a GitHub PR link (a full URL like `https://github.com/<owner>/<repo>/pull/<n>`, or an equivalent `gh`-resolvable reference). Use `gh pr diff <pr>` to collect every file's path, additions, deletions, and hunks.

**If the user didn't provide a PR link, stop and ask.** Do not guess at the current branch, infer from recent history, or fall back to a local `git diff`. Ask the user which diff they want to review — a specific PR URL or number — and wait for their reply before continuing.

## Group changes for comprehension

Do **not** present files in alphabetical or tree order. Reorganize into sections ordered by reviewer value:

1. **Core logic** — New behavior, algorithm changes, state transitions, API surface changes. Show full diffs with surrounding context.
2. **Wiring & integration** — Route registration, dependency injection, config plumbing that connects the core logic. Condensed — enough to confirm correctness.
3. **Boilerplate & mechanical** — Import reordering, renames, generated code, formatting, type re-exports. Summarize as a list of file names and stats. No inline diffs unless specifically relevant.

Lead with core logic. The reviewer's attention is freshest at the top.

## Distill complex logic into pseudocode

When a core change involves dense or intricate logic — deeply nested conditions, state machines, retry/backoff flows, multi-step transformations — add a short pseudocode summary next to the diff. The pseudocode should strip away language syntax, error handling, and boilerplate to expose the essential algorithm or control flow in a few lines. This lets the reviewer confirm intent before reading the real code.

Only do this when the actual diff is hard to scan. Straightforward changes don't need a pseudocode mirror.

## Trace tricky logic on a concrete example

Pseudocode shows the shape of the change; an example trace shows it executing. When a hunk changes behavior in a way that's hard to predict from reading it — reordered effects, new short-circuits, altered edge cases — pick a concrete input and walk it through both the old and new code paths side-by-side, highlighting the step where they diverge and what the observable outcome is. Keep the input small and realistic.

Use this for genuinely surprising behavior changes, not every core hunk.

## Call attention to tricky things

When a hunk contains something surprising, risky, or easy to miss, visually separate it from the surrounding diff and pair it with a short tag (e.g. "Subtle", "Breaking", "Race condition", "Perf") and a one-sentence explanation so the reviewer sees the concern and the code together.

Reserve these callouts for genuinely tricky items — overuse destroys signal.

## Tone and content

Write reviewer-facing commentary, not a changelog. Focus on:
- **Why** something changed, not just what changed.
- Interactions between files — e.g. "The new validator in `core.ts` is invoked by the route added in `routes.ts`."
- Anything the diff alone doesn't make obvious.

Keep commentary terse. One or two sentences per note.

## Be creative

The sections above are a floor, not a ceiling. The goal is the fastest possible path for the reviewer to understand this specific change — so look at the diff in front of you and ask what representation would actually help. A tiny state diagram, a before/after call graph, a table of input→output pairs, a timeline of commits, a confidence annotation per file, a single large callout with everything else collapsed — whatever fits the change.

The canvas SDK has charts, tables, diff views, DAG layout, cards, stats, interactive state, and more. Reach for whichever components best serve the change at hand. A review of a refactor looks different from a review of a bug fix looks different from a review of a new feature — let the canvas reflect that.
