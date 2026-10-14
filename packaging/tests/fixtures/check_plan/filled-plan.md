# CSV export plan

Admins can export any report as CSV. Every export is verified live before merge. PR-1 ships it.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs the installed poteto-mode skill's `playbooks/autopilot-full.md`. Each owner merges its own PR. No PR stops at merge-ready.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on her explicit go.
- [ ] Read these from trunk at program start. Re-read them at every tick.
  - [ ] `re-read the installed playbook at playbooks/autopilot-full.md`
  - [ ] the installed `swarm` skill
  - [ ] `git show origin/main:.claude/skills/control-cli/SKILL.md`
  - [ ] this playbook file where your host installed it (`playbooks/opening-a-pr.md`)
  - [ ] each other leaf skill the program uses, as installed
- [ ] On the operator's go, schedule the hourly audit with a supported host loop or scheduler and the tick prompt below. If none is available, report the limitation. Never leave the cadence to memory.
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook from trunk. Audit the operation against it and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Then post a short status message to the operator in chat only when the audit found a tracked change that no earlier status message reported, such as a PR opened, a code-ready head, a round launched or closed, a verdict, a merge, a stuck agent and the action taken, a blocker added or cleared, or a decision only the operator can make. Name every such change and nothing else. Do not repeat a table, the merged list, or an unchanged blocker. If the audit found none, end the turn with no reply text. Either way, log this tick's row in your decision trail. The row names the items reported, or none."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle the execution playbook names.
- [ ] Follow this dependency graph. Start dependent work only after its parent merges, or base it on the parent branch when the execution playbook stacks.
  - [ ] PR-1 and PR-1 are independent and first. Both branch from `main`.
  - [ ] PR-1 after PR-1.
- [ ] Hold the file boundaries. PR-1 touches only `src/export/**`.
- [ ] Hold the review gate. PR-1 change an interaction. They wait for the operator's review in chat with screenshots and a video before merge.

### PR mechanics, for every PR

- [ ] Resolve the forge once. Default to `gh`; if `command -v origin` succeeds and Origin can resolve the repository, use `origin pr` for every PR operation. Record any fallback to `gh`. Never require `gt`.
- [ ] Open the PR ready, never draft, with `origin pr create --status open --base <base-branch>` or `gh pr create --base <base-branch>` according to the resolved forge. A stack child targets its parent branch.
- [ ] Run the repo's lint and typecheck once before the PR-facing push. Push with hooks on.
- [ ] Strip code slop before each commit (see Opening a PR) and run `/no-comments` before review.
- [ ] Triage every automated-reviewer and security-reviewer comment per `../references/automated-reviewer-triage.md`.
- [ ] Rebase onto current trunk before babysit and again before the merge-ready report.

### Verdict and merge, for every PR

- [ ] At the merge-ready head SHA, run the swarm per the installed `swarm` skill. One gates lane. The ten live lanes from the PR's **Verify, live** block. The perf lane from its **Verify, perf** block. One audit lane that reads the diff and the receipts and distrusts the PR body.
- [ ] Clean only when every lane is `PASS`. Findings go back to the owner. A new head gets a fresh swarm and a fresh verdict.
- [ ] The owner squash-merges on a clean verdict, patch-id unchanged per `playbooks/shipping.md`.

### Boot recipe, for every live lane

Each live lane runs on its own cloud VM at the PR head. Drive through `control-ui` or `control-cli` from the project's verification skills.

- [ ] `git fetch origin <head-branch> && git checkout <head SHA>`.
- [ ] Start the server with pnpm dev. Wait for the ready log line.
- [ ] Drive it only through control-cli. Tail the server log read-only.
- [ ] Save every screenshot to `/tmp/swarm-<pr-id>/worker-2/<slug>.png` and return the paths with the report.

## Add CSV export (PR-1)

**Depends on.** None.

**Files.**

- [ ] Edit `src/export/csv.ts`.
- [ ] Create `src/export/csv.ts`.
- [ ] Delete `src/export/csv.ts`.

**Build.**

- [ ] Add `toCsv` in `src/export/csv.ts`.

**You see.**

- [ ] The export button saves report.csv.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `src/export/csv.test.ts` gains the quoting case. Run `pnpm test csv`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `gpt-6-sol` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run the report export at trunk and head. If trunk lacks the feature, record that and gate the saved file and its row count. Save `export.png`. Pass when the file has every row.
- [ ] Lane 2. Export a report with quoted fields. Save `export.png`. Pass when the file has every row.
- [ ] Lane 3. Export a report with quoted fields. Save `export.png`. Pass when the file has every row.
- [ ] Lane 4. Export a report with quoted fields. Save `export.png`. Pass when the file has every row.
- [ ] Lane 5. Export a report with quoted fields. Save `export.png`. Pass when the file has every row.
- [ ] Lane 6. Export a report with quoted fields. Save `export.png`. Pass when the file has every row.
- [ ] Lane 7. Export a report with quoted fields. Save `export.png`. Pass when the file has every row.
- [ ] Lane 8. Export a report with quoted fields. Save `export.png`. Pass when the file has every row.
- [ ] Lane 9. Export a report with quoted fields. Save `export.png`. Pass when the file has every row.
- [ ] Lane 10. Export a report with quoted fields. Save `export.png`. Pass when the file has every row.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Export time for 10k rows. Trunk lacks export, so also the time to a saved file.
- [ ] Probe. Run `pnpm bench export` at trunk and head, interleaved.
- [ ] Baseline. Record the trunk time first.
- [ ] Rule. Fail when the saved file takes over 2 seconds.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 2 screenshots into `docs/media/pr-1-review-export.png`.
- [ ] Record a 30 to 60 second video of the change on a lane VM. Save it as `docs/media/pr-1-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Automated-reviewer triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] The owner squash-merges its own PR.

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the report the execution playbook names.

## Appendix A. Prototype evidence

Streaming beat buffering on branch proto-csv at abc1234. Nothing stays unproven.

## Appendix B. Alternatives rejected

Server-side zip lost on memory.

## Appendix C. Risks

PR-1 risks large reports. The owner watches memory.

## Appendix D. Links and reading list

Read docs/export.md. PR-1 gets how and interrogate. The trail lives in docs/trail.
