### Opening a PR

Invoked at the end of every other playbook.

**Worktree.** Work from a git worktree off main; delegates receive its path or branch. Concurrent writers each get their own worktree; sequential writers reusing one branch run `git fetch && git reset --hard origin/<branch>` between passes. Dirty branch with unrelated work: patch out, fresh worktree, apply. Snarled worktree: reset from main, redo minimally.

**Commits.** Commit liberally; rebase into small, ordered commits before opening PRs. Each commit is a future PR: landable, ordered to tell the story. Amend when the fix belongs in a just-made commit; new commit when separable.

**PRs.** Use an installed `deslop` skill when available; otherwise run repository formatting and lint, then inspect the diff manually. Run `/no-comments` before review and apply the **unslop** skill to the PR description and commit bodies. Write every PR title, description, and commit body through the **technical-writing** skill's layers except Diátaxis: one word per action, keep articles, prefer a plain verb over `-ing`.

**Titles.** Conventional Commits, `type(scope): subject` — `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, or `perf`; the changed area as scope (`pstack`, `poteto-mode`); short imperative subject naming the real symbol that carries the change (`fix(pstack): retarget opening-a-pr babysit trigger`). No trailing period. Same technical-writing + unslop pass as the body.

**Descriptions.** A reviewer who has the diff should learn why the change exists, what scope matters, and how you proved the change works. Keep the body brief enough to read in under a minute. If a squash commit copies the PR body and would exceed about 40 lines, shorten the body and link the detailed evidence.

Use these sections in order. Drop a section when it has nothing to say.

- `## Why`. State the intent and approach in one or two short paragraphs. Omit rebase genealogy and a "based on main" preamble.
- `## Scope`. Name real symbols and paths, both sides of a rename or retarget, and scope boundaries when they matter. Avoid a file-by-file essay.
- `## Tradeoffs`. Name rejected alternatives that a reviewer would otherwise ask about. Skip this section when there was no real choice.
- `## Blast Radius`. Name who or what the change touches and why the change is safe or risky. State the continuing cost if main stays red without the fix.
- `## Verification`. Name each real run path and its outcome. For a performance change, give the primary before and after measurement with its unit. Link the detailed evidence, including methodology, remaining metrics, and arena or swarm results.

Attach videos or screenshots after these sections when they prove a claim. Keep SHA lists, lane recitals, metric tables, and full verification logs in a linked artifact. Do not use `## Summary` or `## Test plan` boilerplate. A commit body does not restate its subject.

**Source-control host.** Resolve the repository's provider and available CLI or API before the first PR operation, then keep that choice for create, edit, view, watch, and merge. Use `gh` for GitHub when available, or the provider's supported native interface. Keep configured stack tooling optional. If the selected interface cannot perform an operation, report the limitation and any supported fallback before switching; do not infer state from another provider.

**Size and stacks.** Prefer five narrow PRs to one large PR. A stack is a base-branch chain. The root PR targets trunk; each child branch rebases onto its parent's exact tip and its PR targets that parent branch. Use the team's configured stack tool or the source-control host's native base-branch operations, then read back the base relationships. Branch from trunk only for independent work. Rebase on trunk before substantial stack work.

**Readiness.** Open every PR ready, never as a draft. Host tooling that defaults to draft gets flipped through the host's ready command. Verify state through the repository host's supported PR viewer before referencing status.

**Babysit.** Opening a PR does not start a babysit. Post the URL and keep building; finish the phase or stack first. Run a separate babysit pass only when the operator asks for one once the whole stack exists — a babysit per new PR stalls the build and spends checks on commits later waves restart. Push back when feedback drifts from intent.

A subagent that opens a PR runs `interrogate`, `/deslop`, and `/no-comments`, returns the URL, and does NOT babysit. Return to the parent.
