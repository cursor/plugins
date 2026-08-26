### Opening a PR

Invoked at the end of every other playbook.

**Worktree.** Work from a git worktree off main; subagents inherit it. Multiple `Task` calls on the same branch each get their own worktree, or `git fetch && git reset --hard origin/<branch>` between them. Dirty branch with unrelated work: patch out, fresh worktree, apply. Snarled worktree: reset from main, redo minimally.

**Commits.** Commit liberally; rebase into small, ordered commits before opening PRs. Each commit is a future PR: landable, ordered to tell the story. Amend when the fix belongs in a just-made commit; new commit when separable.

**PRs.** Run `/deslop` from `cursor-team-kit` over the diff before commit. Run `/no-comments` before review. Write every PR title, PR description, and commit body with `/technical-writing`, then apply `/unslop`. Apply every technical-writing layer except Diátaxis. Use one word for each action, keep articles, and avoid `-ing` when a plain verb works.

**Titles.** Use Conventional Commits in the form `type(scope): subject`. Use `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, or `perf` as the type. Use the changed area, such as `pstack` or `poteto-mode`, as the scope. Keep the subject short and imperative. Apply the same `/technical-writing` and `/unslop` pass as the body. Name a real symbol when one carries the change. For example, `fix(pstack): retarget opening-a-pr babysit trigger`. Do not add a trailing period.

**Descriptions.** Use these sections in order. Drop a section when it is empty.

- `## Why`. State the intent and why this approach fits.
- `## Scope`. State facts from the diff. Name real symbols and paths. Name both sides of a rename or retarget. State what is in and out when the boundary matters.
- `## Tradeoffs`. State real choices only. Skip this section when there are none.
- `## Blast Radius`. State who and what the change touches. Explain why the change is safe or risky. If main is red without the fix, name the continuing cost.
- `## Verification`. State how you ran each check and its rigor. Name the real path, such as `control-cli`, `control-ui`, or the targeted tests. State the outcome of each check, not only the command name.

After these sections, attach videos or screenshots when they prove a claim. Do not use `## Summary` or `## Test plan` boilerplate. A commit body does not restate its subject.

**Size and stacks.** Prefer five narrow PRs to one large PR. Stack follow-ups with Graphite (`gt`), and keep the ordered stack visible to reviewers. Branch from main only for independent work. Rebase on `main` before substantial stack work.

**Readiness.** Open every PR ready, never as a draft. Cloud-agent PR tools default to draft, so set `draft: false` on every PR creation call. If a PR still opens as a draft, run the host's ready command, such as `gh pr ready <number>`. Run `gh pr view <number>` before you refer to PR status.

**Greptile.** After the PR opens, freeze the remote head SHA and keep the branch to one writer. First determine whether Greptile applies to the repository, branch, and PR. Permit `NOT_APPLICABLE` only when the integration proves that the repository is not configured or that policy excludes the branch or PR. Record that evidence and continue without claiming Greptile clearance. At any Greptile step, return the PR as `BLOCKED` when authentication, permissions, an outage, or an ambiguous error prevents eligibility detection, generation inspection, a review request, or a required reply. For an eligible PR, use the active host to inspect the Greptile review generation for the frozen SHA. Request one if none exists, and wait up to 15 minutes while it is pending. Accept only a successful completed review for the frozen SHA. If a generation proves one of the permitted `NOT_APPLICABLE` cases, record the evidence and continue without clearance. If the review fails, reports any other skip, or times out, return `BLOCKED` with the request and generation evidence. Rate every finding `fix`, `dismiss`, or `ask` against the code per `../references/bugbot-triage.md`. Commit and push every valid fix on the branch that owns the code, rerun its proof, and reply with the commit. For every finding you leave unchanged, reply with the concrete reason. Each push creates a new head and requires a new Greptile generation. Before returning, confirm that the remote head still equals the reviewed SHA and that no Greptile finding is unanswered. Repeat if either check fails. This pass does not start Babysit or poll CI.

**Babysit.** Opening a PR does not start a babysit. Finish the Greptile pass above, post the URL, and keep building. Run a separate babysit pass only when the user asks for one after the whole stack exists. A babysit for each new PR stalls the build and spends checks on commits that later waves restart. Push back when feedback drifts from intent.

A subagent that opens a PR runs `interrogate`, `/deslop`, and `/no-comments`. It returns the URL and branch to the parent, which owns the Greptile pass and any resulting edits. It does not babysit.
