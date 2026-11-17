### Opening a PR

Invoked at the end of every other playbook.

Work from a git worktree off trunk, and keep unrelated work out of it. Rebase into small, landable commits. Run `/deslop` from `cursor-team-kit` over the diff before commit.

Title: `type(scope): subject`, naming a real symbol when one carries the change. Body: a one-minute briefing under 40 lines with these `##` headings in order, dropping empty ones: `## Why`, `## What changed`, `## Scope`, `## Tradeoffs` (only rejected alternatives a reviewer would otherwise ask about), `## Blast Radius`, `## Verification`.

Stack follow-ups by base branch. Open PRs ready unless the user's request or the `pull requests` line in `~/.cursor/rules/pstack-models.mdc` asks for a draft. The request wins over the line, and a missing rule or line means ready. Through the run's PR tool, pass `draft: true` for a draft and `draft: false` otherwise. Without one, use `gh pr create`, with `--draft` only for a draft, or `origin pr create` when Origin's CLI resolves the repository, with `--status open` for a ready PR or the draft status that `origin pr create --help` lists. If a PR opens in the other state, fix it through the PR tool, or with `gh pr ready <number>`, `gh pr ready --undo <number>`, or `origin pr ready <number>`. Keep a draft a draft until the user asks for it ready. A playbook that merges the PR marks it ready right before the merge. When an agent you start opens the PR, ask for a draft in its kickoff, since `worker.md` opens PRs ready otherwise. Opening a PR does not start a babysit.
