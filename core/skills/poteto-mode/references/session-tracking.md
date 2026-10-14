# Record work while it happens

Create one run per task and keep its printed id. Use `python3 <skill-dir>/scripts/run-record.py --run <id>` for every subsequent command; this is `rr` below. Give this exact prefix to a delegate that works in the run's workspace. A delegate working in its own worktree records nothing: it returns its output paths, and you record `delegate --status returned` and re-run verification in the run's workspace. A session may contain multiple runs, and several sessions may work in the same project. Never choose their run by the shared `current` file.

At init, supply `--host <claude|codex|copilot|vscode-copilot> --session-id <id>` when the host exposes its session id. Only Claude's session environment variable is read automatically; Codex and Copilot expose none that pstack knows of, so pass `--host` and `--session-id` there. Do not invent a session id. Without one the observer can link from init output, or label a time-based association as inferred.

Record the start before doing work, the outcome after it, and the reason for moving on:

First run `rr tasks --json` to get the exact phase ids and evidence requirements. Refresh the
host task list from this export after recording each boundary. Bug fix uses named phases;
Opening a PR uses `worktree`, `cleanup`, `commits`, `reverify`, `write`, `create`, and `readiness`.
Do not derive phase ids from step numbers. `rr tasks` renders the same state as a Markdown checklist.

```sh
rr phase reproduce --start
rr phase reproduce --done
rr phase root-cause --start --from reproduce --reason "failing baseline preserved"
```

Each start after a finished or failed attempt creates a new attempt. `--block "<reason>"` keeps the attempt open; `--start` resumes that blocked attempt. Pause safely works in the task's run and starts no run of its own; `init --route pause-safely` is refused. Record each cancelled delegate, then close the current phase: `--done` if it finished, `--block "paused: <why>"` if you backed out. Then run `rr pause --next "<first action on resume>"`. While paused, phase entries are refused and `check` reports the run incomplete with the resume point. `rr resume` restores it, and `--start` then picks the blocked attempt back up. A tool ending or an agent finishing its turn does not finish the phase. Missing starts remain unknown in the UI.

For bug-fix investigation, start both branches under the active parent. Use host agent ids when available; otherwise omit `--agent` and retain the parent as owner.

```sh
rr phase root-cause/how --start --agent <how-agent-id> --from root-cause --reason "explain the mechanism"
rr phase root-cause/why --start --agent <why-agent-id> --from root-cause --reason "investigate the history"
rr phase root-cause/how --done
rr phase root-cause/why --done
rr phase root-cause/confirm --start --from root-cause/how --from root-cause/why --reason "test both reports against runtime evidence"
rr phase root-cause/confirm --done
rr phase root-cause --done
```

Planning's nested steps are `plan/architect-a`, `plan/architect-b`, and `plan/architect-c`. Start the parent `plan` first. Record applicable steps and explain skips, including C when approval was not requested. A parent cannot close while its children are open. Resolve failed children before marking the parent done. A new parent attempt preserves old child history and starts with no child work recorded for that attempt.

Attach evidence to an open attempt with `evidence ... --phase <name>`. Add `--tool-id <host-call-id>` when known. The command prints the evidence sequence number. Delegate records accept `--phase`, `--agent-id`, and `--tool-id` as well. These are explicit links; omit unavailable ids.

```sh
rr phase verify --start
rr evidence --kind verify --result fail --output <file> --command "<test command>" --phase verify
rr phase verify --fail "original reproduction still fails"
rr phase root-cause --start --from verify --reason "retest the surviving mechanism" --evidence <printed-sequence>
```

For a report or other deliverable, save the actual artifact and attach it with
`rr evidence --kind artifact --result pass --output <path> --phase <id>`. Use `verify` for
verification output and `review` for a review verdict. A gate requiring a returned delegate
needs `rr delegate ... --phase <id>` for that attempt. Evidence from an earlier attempt does
not satisfy a new attempt. PR re-verification needs current verification evidence even when
no rerun is necessary; attach the existing passing output only if it still describes this tree.

The record lives in the repository's main checkout under `.pstack/runs/`, so removing a worktree never removes it, and `rr --run <id>` finds it from any worktree. A submodule keeps its records in its own checkout. When the main checkout cannot be written, or its directory is gone, `init` says so and keeps the record in the worktree, where removing the worktree removes it. A run id names one run across all of them, and only live worktrees of this repository are searched. A run fingerprints its workspace: the checkout where `init` ran, or the worktree `workspace --path` moved it to. Start the run inside the worktree you will edit. If it started elsewhere, move it before any evidence with `rr workspace --path <worktree>`, run from that worktree. A move is refused once evidence, a baseline, or grounding exists, while a delegate attempt is open, and after one move except back to where `init` ran. Commands that record refuse to run from any checkout but the workspace; `check` and `status` fingerprint the workspace wherever they run, and `tasks` only reads the record. `git worktree move` keeps a run's workspace, including under `worktree.useRelativePaths`. A run moved with `workspace` by a release before this one recorded no admin directory, so after `git worktree move` it reads as removed: incomplete, never falsely complete. Once the workspace is removed, `check` reports the run incomplete, since its evidence can no longer be re-fingerprinted; verify the merged result in a new run. Another live worktree nested inside the workspace, such as `.claude/worktrees/agent-1`, is left out of its fingerprint; once its directory is deleted without `git worktree remove`, files at that path count again.

Save outputs under `.pstack/runs/<id>/` or outside the working tree. The record refuses an output anywhere else in the workspace, since a file there could be source. To record a deliverable that lives in the tree, copy it there first. Every output keeps its recorded hash, a superseded baseline's included.

The fingerprint is the tree id of the working tree with `.pstack/` left out. In a Git workspace it counts tracked and untracked files but not files Git ignores, so an edit to an ignored file does not make evidence stale; without Git it counts every file. A nested repository or submodule counts by its working-copy content, whatever its `core.worktree` says, so committing inside it, or recording that commit in the outer repository, leaves evidence fresh. Commit-shaped trees are compared in three places only: the baseline check, `ground check` (so a commit inside a submodule re-runs grounding scoped there), and entries stamped before content ids existed. One with no commit, or a gitlink directory that holds files but no repository, counts by its contents. In a sparse checkout, a file outside the cone counts once it is on disk (Git 2.34 or later). Assume-unchanged and skip-worktree bits hide neither an edit nor a deletion, except that a sparse checkout's skip-worktree path absent from disk counts as the index has it. A tracked symlink counts by its link text, so edits to a target under `.pstack/` or outside the workspace go unseen: keep code out of those places. A stored fingerprint is compared as a string with one written at check time and is never read back as a Git object, so `git gc` pruning the objects it wrote changes no result.

A `ground` scope inside a nested repository compares that whole repository, so any change in it makes the grounding stale. A scope outside the workspace, or under `.git/` or `.pstack/`, is refused.

Record every return when it happens, then record the work again. A retry does not turn earlier failures into successes. `rr check` still requires current evidence and completed or justified skipped phases. Mandatory gates reject skips. A failed review verdict remains incomplete until a subsequent passing review replaces it, or until its phase is skipped afterward where the gate allows a skip; separately recorded findings must also be resolved. Existing records are checked against the installed contract, so an older record may need additional evidence after an update. Never edit a record to remove required phases.

A gate requiring a returned delegate accepts `--note "parent: <the limitation>"` instead only where its requirement shows `parent_note`, for a host or agent that cannot delegate. The note names the limitation in at least three words.

A run still in its first phase closes into another playbook with `rr reroute --route <playbook> --reason "<why>"`, only where its contract names that playbook in `reroute_to` (Orchestrate to Autonomous run). It is refused while an actionable finding is open, a delegate is running or ended in failure with no retry or drop, or the first phase failed or is blocked. The new run takes over the task, and the `current` pointer when it pointed at the old run. The old record accepts no further entries. Its `check`, with or without `--through <new run's phase>`, reports the new run plus the old run's own evidence files, delegates, and findings.

## What `check` enforces

- Every required phase has a recorded outcome, done or skipped with a reason. A phase marked done is checked against its gate only when the contract (`requirements` in `tasks --json`) names one: `evidence` of that kind for the attempt, `fresh` evidence taken on the current tree, a returned `delegate`, and `steps` such as `root-cause/confirm` done in the same attempt. Phases without a gate need only the outcome.
- `skip: false` makes a gate mandatory. `skip_with: <phase>` allows a skip only after that phase was skipped too. `skip_reasons` accepts a skip only when the reason's first word is one of the listed words (Babysit step 6: `threads-only`; Multi-phase plan step 4: `small-change`). Review gates (Bug fix `review`, Feature `step-7`) are conditional, so they take a skip with the reason the trigger does not apply.
- Order applies only to routes whose contract is ordered: the latest done attempt of each phase began after the one before it had an outcome, so redoing a phase in order clears an earlier out-of-order done. Redoing a phase does not reopen the phases after it, so re-verifying a step leaves later steps standing. Unordered routes (`"ordered": false`) check only the pairs they name, such as Bug fix's reproduce before implement.
- Evidence commands are recorded, not run. `check` compares digests and tree fingerprints. It does not rerun a command or judge whether its output shows a pass.
- `--through <phase>` limits phases, gates, and review verdicts to that phase and the ones before it. Open delegates, unresolved findings, and a pause always count.
