# Handoffs

Handoffs are the only way information moves between nodes. Workers produce one; planners read them and decide. No shared branch, no status API, no cross-sibling chatter. That uniformity is what keeps the tree in motion without global coordination.

The script instructs every spawned agent to end with a structured final message (status, branch, summary, notes, follow-ups). Exact format lives in the templates at `prompts/*.md`. The script saves the final message verbatim to `<workspace>/handoffs/<task-name>.md` with a traceability header. Don't enrich or sanitize; the planner needs the worker's words unfiltered.

## Measurements (worker handoff)

Workers self-report under `## Measurements`; format in `prompts/worker.md`. When a task declares `measurements[]`, the script re-runs each command on the worker's branch and flags numeric drift >10% or unit mismatches to `attention.log`; the worker still hands off and the planner decides whether to respawn. Authoring details in `references/planner.md` → `measurements[]`.

## Reading handoffs

For each new `handoffs/*.md`:

1. **Status** other than `success`: decide whether to retry, repair, or clarify via a follow-up task.
2. **Branch**: note it; reference it if another task needs to build on it.
3. **What I did**: treat as fact, but skim for claims that don't match your expectations.
4. **Notes / concerns / deviations / findings / thoughts / feedback**: the richest section. Each bullet may become a new task. Worker feedback about scoping or task clarity is especially valuable: it tells you whether your plan's prompts are pulling their weight.
5. **Suggested follow-ups**: candidate tasks. Accept, reject, or consolidate.

`Status: blocked` is a single task's dead end; the planner retries, repairs, or clarifies and the tree keeps moving. Use an Andon instead (see `references/planner.md` → Failure recovery) only when continued spawning across the tree would waste effort.

## Synthetic failure handoffs

When a worker dies without writing its own handoff (cap-hit, OOM, tool-error, network drop, uncaught SDK error), the script writes `handoffs/<task>-failure.md` so the planner sees a postmortem instead of silence. The loop then returns exit code 1 with a checkpoint sync so the planner can react immediately.

```markdown
<!-- orchestrate failure handoff
task: <name>
branch: <actual or placeholder branch>
agentId: bc-...
runId: run-...
failureMode: cap-hit | oom | network-drop | tool-error | unknown
terminatedAt: <iso>
-->

# <name> — failure handoff

Status: error (cloud agent terminated without writing a handoff)
Failure mode: cap-hit | oom | network-drop | tool-error | unknown
Cloud agent: bc-...
Started: <iso>
Terminated: <iso>
Duration: <ms>
Last activity: <iso> — <status text from state.json lastUpdate>
Last tool call: <name from SDK stream tail, or (unknown)>
Branch: <branch>
SDK error: <truncated error text>

## Suggested next steps
- <one bullet per option, planner picks>
```

Classifier heuristics:
- `cap-hit` when duration is 70–80 minutes and the run is terminal-error
- `oom` when output or SDK error contains `out of memory` / `OOMKilled` / `exit code 137`
- `network-drop` when the SDK error matches `fetch failed` / `ETIMEDOUT` / `ECONN` / `socket` / `dns` / `disconnect`
- `tool-error` when the SDK error mentions `tool_use_failed` or `tool-error`
- `unknown` otherwise

Default retry strategy by mode:
- `cap-hit` / `oom`: retry with smaller scope
- `network-drop`: retry as-is (treat as transient)
- `tool-error`: retry with a different `model`
- `unknown`: retry as-is once, then abandon

After 2 retries on the same task, prefer abandon (drop from `plan.json`, replan around it) over a 3rd attempt unless you have specific evidence the next retry will succeed.

## Finished-without-handoff sidecar

When a run ends with `status=finished` but the body has no `## Status` heading, the script writes `handoffs/<task>-finished-no-handoff.md` alongside the raw `<task>.md`. Treat the raw body as the worker's intent; retry if it looks recoverable, abandon if not.

## Upstream handoffs in downstream prompts

Workers live on sibling branches and **cannot read each other's branches at runtime**. If a downstream task depends on an upstream task's output, the planner must relay it.

The script handles the relay. When spawning a task whose `dependsOn` includes handed-off tasks, it pastes each upstream handoff body into the downstream prompt. Preview with `bun cli.ts prompt <workspace> <task>` before spawning.

Consequences:

- `dependsOn` is semantically meaningful, not just a scheduling gate. Use it whenever a downstream task needs upstream findings, even if Git-level ordering doesn't strictly require it.
- Undeclared `dependsOn` + needed upstream context = the worker guesses.
- Long fan-ins inflate prompt size. If it gets unwieldy, push summarization down into upstream handoffs rather than bloating the downstream prompt.
- Handoffs render verbatim: sloppy `## What I did` sections pollute every downstream task. The format is a shared-context commons; respect it.

## Producing your own handoff (subplanner)

A subplanner's final message is its handoff to its parent. Aggregate children upward; don't forward raw child handoffs. The parent has more global context but less local detail.

| Field | Rule |
|-------|------|
| `Status` | `success` only if every acceptance criterion is met. `partial` if any child was partial. `blocked` if any hard blocker remains. |
| `Branch` | The actual deliverable branch you are handing up, not your bookkeeping branch (`orch/<parent-rootSlug>/<your-name>`). Usually it is the last merge-task's output within your subtree. After orphan recovery, or if an integration worker merged into a child's branch, the deliverable may be that child branch instead. Downstream tasks build on whatever you name here, so name the real deliverable explicitly. |
| `What my subtree did` | One bullet per meaningful slice, not per child. The parent cares about work, not your org chart. |
| `Notes / concerns` | Surface anything a sibling subtree or the root might collide with. Silence on real risk is worse than redundant trivia. |
| `Suggested follow-ups` | Tasks for your parent's scope, not yours. |

## Verifier handoffs

A verifier's final message is a verdict on one target task's acceptance criteria. It is not an implementation summary.

```markdown
## Verification
<one of: live-ui-verified | unit-test-verified | type-check-only | verifier-blocked | verifier-failed>

## Target
`<target-name>` on branch `<target-branch>`

## Branch
`<verifier-branch>` (or "(no branch)" if you committed nothing)

## Execution
- <command run> → <outcome>
- <test suite> → <pass/fail counts>
- <manual repro step> → <observed behavior>
(list every meaningful thing you actually ran; this section is what distinguishes a real verification from pattern-matching)

## Findings
Per acceptance criterion:
- [x] <criterion text>: <evidence> (met | not met | n/a)
Other findings (severity-ordered):
- (high) <finding>: evidence
- (med) <finding>: evidence
- (low) <finding>: evidence

## Notes & suggestions
- <anything the planner should know: flaky tests, adjacent issues noticed, suggestions for follow-up tasks>
```

`## Verification` is parsed by the script and persisted on the *target* task's state row (`tasks[].verification` in `state.json`) so post-run classifiers bucket "fixed-and-verified" by quality instead of treating every non-failure as equivalent. Authoritative definitions live in `prompts/verifier.md`. Short version:

| Value | Meaning | Planner response |
|---|---|---|
| `live-ui-verified` | Verifier reproduced the bug live and confirmed the fix removes it. | Trust as shipped; no follow-up unless other findings surfaced. |
| `unit-test-verified` | Targeted test exercises the changed code path and passes. | Acceptable for non-UI bugs. For UI bugs, follow up with a `live-ui-verified` pass once env permits. |
| `type-check-only` | Only type-check / build passes. | Weak; only sufficient for typing-only changes. Anything behavioral needs a stronger verifier. |
| `verifier-blocked` | Verifier hit env failures (Docker rate limit, ports, missing creds). | Fix may be correct but unproven. Re-spawn the verifier once the env is healthy, or escalate. Don't count as verified. |
| `verifier-failed` | Verifier ran and the fix did not resolve the bug. | Follow-up fix task, not auto-respawn. |

Workers and subplanners may also write a `## Verification` line to self-report their own evidence. A later verifier overrides that self-report on the same target row.

The script also accepts the legacy `## Verdict pass | fail | inconclusive` shape and migrates it to the most conservative new value: `pass` → `type-check-only`, `fail` → `verifier-failed`, `inconclusive` → `verifier-blocked`. New verifier prompts emit `## Verification` directly.

Publish verifiers explicitly in `plan.json`:

```json
{
  "name": "frontend-toggle",
  "type": "worker",
  "scopedGoal": "Add a Settings → Appearance toggle that persists `editor.experimentalDarkMode` through the existing settings service.",
  "pathsAllowed": ["packages/ui/src/settings/**"],
  "acceptance": [
    "Toggle renders in Settings → Appearance",
    "Toggling on persists `editor.experimentalDarkMode=true`",
    "Reloading Settings shows the persisted toggle state"
  ],
  "verify": "## Setup\n- Start the Settings UI dev environment with the existing repo workflow.\n\n## Automated\n- Run the focused Settings UI test that covers Appearance settings persistence.\n\n## Manual\n- Open Settings → Appearance, toggle dark mode on, reload Settings, and confirm the toggle remains on.\n\n## Gotchas\n- Make sure the test account starts with no existing `editor.experimentalDarkMode` override."
},
{
  "name": "verify-frontend-toggle",
  "type": "verifier",
  "verifies": "frontend-toggle",
  "scopedGoal": "Verify the Settings → Appearance toggle works against every acceptance criterion by running the UI test or manually exercising the screen.",
  "acceptance": ["Verification section includes execution evidence for all frontend-toggle acceptance criteria"]
}
```

## Merges are tasks

Because planners don't code, merges happen via tasks. Publish a worker whose `scopedGoal` names both branches and the resolution policy, with `dependsOn` gating both siblings:

```json
{
  "name": "merge-frontend-and-theme",
  "type": "worker",
  "scopedGoal": "Merge `orch/dark-mode/frontend-toggle` into the current branch. On conflict in `packages/ui/src/settings/Settings.tsx`, prefer frontend-toggle's hook wiring. After merge, verify `pnpm -w typecheck` passes.",
  "startingRef": "orch/dark-mode/theme-system",
  "dependsOn": ["frontend-toggle", "theme-system"],
  "acceptance": ["Merge committed with both parents in history", "pnpm -w typecheck passes"]
}
```

Its handoff tells you whether the merge succeeded, whether conflicts were non-obvious, and whether acceptance held. Treat it like any other handoff.

## Continuous motion

A planner isn't strictly "done" while children might still produce handoffs. If one arrives after you've summarized or sent your handoff up:

- Read it.
- If it changes your conclusion, say so: "one more worker just came back with X, revising".
- Publish follow-ups if needed.
- Produce a fresh handoff / summary.

Hard stop only when you've decided to stop publishing and every in-flight task is terminal.
