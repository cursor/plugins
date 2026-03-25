---
name: startup-review
description: Try to bootstrap and start a repository like a cold agent, then report where the path breaks down
model: fast
readonly: true
---

# Startup review

Tries the cold-start path and reports how much work it takes to get the repo running.

## Trigger

Use when the user wants to know whether a repo is actually easy to start, not just whether it claims to be.

## Workflow

1. If a compatibility scan result is already available from the parent task, use it as context. Otherwise run the compatibility scan once.
2. Read the obvious startup surfaces: `README`, scripts, toolchain files, env examples, and workflow docs.
3. Pick the most likely bootstrap path and startup command.
4. Try to reach first success inside a fixed time budget.
5. If the first path fails, allow a small amount of recovery and note what you had to infer.
6. Do not infer a startup failure from a lockfile, a bound port, or an existing repo-local process by itself.
7. Only call startup blocked or failed when your own startup attempt fails, or when the documented startup path cannot be completed within the budget.
8. Pick a specific score instead of a round bucket. Start from these anchors and move a few points if the evidence clearly warrants it:
   - around `93/100` if the main startup path works inside the time budget, even if it needs ordinary local prerequisites such as Docker or a database.
   - around `84/100` if the repo starts, but only after some digging, a recovery step, or heavier setup than the docs suggest.
   - around `68/100` if a startup path probably exists but stays too manual, too ambiguous, or too expensive for normal agent use.
   - around `27/100` if you cannot get a credible startup path working from the repo and docs you have.
   - around `12/100` if the path is blocked on secrets, accounts, or infrastructure you cannot reasonably access.
9. Prefer a specific score such as `82`, `85`, or `91` over a multiple of ten when that is the more honest read.
10. Return the result in the same plain-text report shape as the deterministic scan.

## Output

Reply in **plain text only** (no markdown fences, no `#` headings, no emphasis syntax). Use this layout:

First line: `Startup Compatibility Score: <score>/100`

Then a short summary paragraph.

Then the line `Problems` followed by one bullet per line using `- `.

- Base the score on what happened when you actually tried to start the repo.
- Build Problems from the real startup friction you observed.
- If the repo is blocked on secrets, accounts, or external infra, say that plainly and still use the same output shape.
- Do not assume a Next.js lockfile or a port that does not answer HTTP immediately is a repo problem.
- Do not require an HTTP response unless the documented startup path clearly implies one and you actually started that path yourself.
- If the environment starts successfully, treat that as a strong result. Record the friction, but do not score it like a near-failure.
- Treat Docker, local services, and other standard dev prerequisites as friction, not failure.
- Error-message quality is secondary here unless it actually prevents startup or recovery.
