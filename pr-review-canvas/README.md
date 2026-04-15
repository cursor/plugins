# PR Review Canvas

Cursor plugin for rendering pull request diffs as an interactive Cursor Canvas organised for reviewer comprehension rather than file-tree order.

## What it includes

- `pr-review-canvas`: build a Canvas that presents a PR diff with core logic up top, wiring/integration condensed in the middle, and boilerplate summarised at the bottom; add pseudocode, example traces, and inline callouts for the parts that are genuinely tricky.

## When to use

- Reviewing a pull request and you want a walkthrough that surfaces the real risk, not a file-by-file diff.
- Summarising a stack of PRs for a human reviewer.
- Asking for a diff walkthrough, change-set overview, or "what actually changed here" view.

Trigger it with phrases like "PR review canvas", "review this PR on a canvas", "walk me through this diff on a canvas", or by pointing the agent at a PR URL / branch ref.

## How it's organized

The skill groups changes by reviewer value:

1. **Core logic** — new behaviour, algorithm changes, state transitions, API surface changes. Full diffs with context.
2. **Wiring & integration** — route registration, DI, config plumbing. Condensed.
3. **Boilerplate & mechanical** — imports, renames, generated code, formatting. Summarised as a list, no inline diffs unless directly relevant.

It then layers in pseudocode for dense logic, concrete before/after example traces for behaviour changes that are hard to predict from the diff, and inline callouts (`Subtle`, `Breaking`, `Race condition`, `Perf`) for genuinely surprising or risky hunks.

## Requirements

- Cursor with Canvas enabled.
- Access to the diff source: a local branch/ref (`git diff`), a GitHub PR URL or number (`gh pr diff`), or a Graphite stack (`gt` CLI / `gh`).

## License

MIT
