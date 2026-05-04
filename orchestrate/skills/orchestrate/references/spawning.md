# Spawning tasks

Contract between `plan.json` entries and the cloud agents the script spawns. Mechanics (auth, `CursorAgentError` vs `RunResult.status === "error"`) live in `cursor-sdk/SKILL.md`. Read that first.

## Branch naming

Cloud agents own their working branch. `state.json` starts with a deterministic placeholder (`orch/<rootSlug>/<task-name>`) so pre-spawn state is readable, then replaces it with the branch reported by `Run.git.branches[].branch` after handoff. Kebab-case is enforced (`TASK_NAME_RE` in `orchestrate.ts`) so task names still feed filesystem paths and prompt text without escaping. No auto-managed integration branch. Branches live independently until a merge task consolidates them (see `handoffs.md` → "Merges are tasks").

Do not ask workers to create or rename branches to match the placeholder. If a downstream task needs an upstream task's code, depend on that upstream task so the script can wait for handoff and use the recorded actual branch.

## Agent naming

Cloud agents are given a `name` at `Agent.create` time so the Cursor agent list (`cursor.com/agents`, IDE agent list) groups a single orchestrate run together and stays readable across dozens of concurrent children.

| Spawn site | Agent name |
|------------|------------|
| Root planner (`cli.ts kickoff`) | `<first line of goal, up to 100 chars>` |
| Worker / subplanner / verifier (`spawnTask`) | `<rootSlug>/<taskName>` — echoes the task's branch without the `orch/` prefix |
| Model catalog probe (`probe-models`) | `probe: <modelSlug>` |

The server caps names at 100 chars and rejects empty/whitespace-only values; the helpers handle both. When `name` is omitted the cloud backend auto-generates one from the first prompt, so this is purely a readability upgrade — dropping a name doesn't change behavior.

## Starting refs and dependencies

| Field | Controls | Default | Pair with |
|-------|----------|---------|-----------|
| `startingRef` | Which branch the cloud agent clones from | `plan.baseBranch` | `dependsOn` when depending on another task's work |
| `dependsOn` | When the task is allowed to spawn | `[]` | The script records the upstream branch from `Run.git` after handoff |

`startingRef` without `dependsOn` gives a point-in-time snapshot: whatever commits exist on that branch at spawn time, which may be nothing. Pair them unless you really mean "start from the current tip, even if empty".

Verifiers default `startingRef` to their target's branch and auto-include the target in `dependsOn`; the planner doesn't need to wire either explicitly.

Any task can set `verify`: a Markdown-formatted plan (setup, automated, manual, gotchas). Workers see it as a target spec; verifiers inherit the target's `verify` as their recipe.

## Spawn design decisions

The script calls `Agent.create` with two deliberate defaults:

- **PRs are opt-in per task.** `autoCreatePR` on the cloud-agent create call mirrors the task's `openPR` flag (default false). The server-side `cloud_agent_pr_control` gate makes that flag a no-op today, so the real mechanism is the worker prompt: when `openPR: true`, the worker is instructed to open a draft PR against `plan.prBase ?? plan.baseBranch` via the ManagePullRequest tool after pushing. Subplanners and verifiers never open PRs; they hand off to their parent. Task-driven PRs give the planner a specific guarantee: this task ships as its own pull request.
- **PR base vs. worker starting ref.** `plan.baseBranch` is the starting ref for workers that don't specify their own. `plan.prBase` (optional, defaults to `baseBranch`) is where openPR workers aim their PRs. Split when you want workers to inherit planner-side setup from the planner's branch but still open PRs against `main` (so each worker PR is mergeable without the planner's branch landing first). Leave `prBase` unset for the classic pattern where worker PRs stack on the planner's branch.
- **No shared integration branch.** Each task is its own island until a merge task consolidates them. An auto-managed integration branch would smuggle planner-level coding decisions into infrastructure, violating Core Principle #1.

## Task prompt contract

The script renders prompts from `scopedGoal`, `pathsAllowed`, `pathsForbidden`, `acceptance`, `startingRef`, `type`, and `openPR`. Fix the plan entry if the prompt doesn't match your intent. Don't patch the prompt template. Every spawned prompt tells the agent:

- It's isolated. No communication with other agents.
- Commit to the current cloud-agent branch and push. No branch renames, merges, or rebases. Open a draft PR only if the task sets `openPR: true` (workers only; subplanners and verifiers never open PRs).
- Final message is the handoff in the structure from `handoffs.md`. That's the only thing the planner reads.

Subplanner prompts also start with `/orchestrate` so the skill loads automatically when the agent boots.

Workers cannot ask clarifying questions mid-run. Under-specified `scopedGoal` produces silent drift. Write each task as if you'll never get another chance to steer it.

Cloud-agent VMs may redact environment variable values as a prompt-injection defense, so do not rely on env vars for data multiple agents must share. Use the planner-authored artifact pattern instead: commit a file to the base branch and reference it by path in `scopedGoal` so clones pick it up. Never paste credentials into `scopedGoal`; it is sent to the model provider and may end up in git history when state sync is on.

## Slack visibility

When `SLACK_BOT_TOKEN` is set, Slack traffic is owned by the script. Agents do not drive lifecycle. The script posts the kickoff thread to `plan.slackChannel`, records the result in `plan.slackKickoffRef`, mirrors task status messages in that thread, and reads `:rotating_light:` on the kickoff message for Andon.

Spawn prompts still include a Slack block because workers may need to leave notes:

- `comment "<note>" --thread-ts <run-thread-ts> --workspace <workspace>` posts a note through the retry queue when silence would hide useful context. `--task <name>` with `--workspace` is also accepted; the CLI validates the task and posts in the run thread.
- For Linear, GitHub, or other external systems, call the relevant MCP directly. Orchestrate's `comment` CLI is Slack-only.

If Slack comments fail, keep working and say what happened in the handoff. Disk handoffs are still authoritative for downstream prompt assembly.

## Tracking & recovery

After each successful spawn the script persists `agentId`, `runId`, and `parentAgentId` to `state.json`, so a later rerun can re-attach via `Agent.getRun` and read lineage from disk. A row with partial identity (exactly one of `agentId` / `runId`) on restart is marked `error` with an explanatory note. Rename and respawn, or prune.

After every handoff the script reconciles dependent verifiers' `startingRef`. The actual worker branch is sourced from the handoff body's `## Branch` line — the SDK leaves `Run.git.branches[].branch` empty for worker runs, so the body is authoritative. Any verifier whose `verifies` points at the just-handed-off task and whose `startingRef` is still the `orch/<rootSlug>/<task>` placeholder is updated to that real branch. Planner-authored `startingRef` overrides win; each propagation logs to `attention.log`. Load also sweeps over already-handed-off rows so state recovered from disk converges before the next spawn.

## Lineage

Each `state.tasks[]` row's `parentAgentId` is the spawning planner's cloud agent id from `plan.selfAgentId` at spawn. `kill-tree --agent-id` walks those parent links downward. If the planner never set `selfAgentId`, children get `parentAgentId: null` and that subtree is skipped for a scoped kill; omit `--agent-id` to cancel the whole tree.

Spawn templates use the child's id as `{{selfAgentId}}` and the parent's as `{{parentAgentId}}`. The id from `Agent.create` is valid before `send()`; the cloud client sends it at create time and rejects a mismatched server response.
