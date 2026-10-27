# Execution Loop and Completion

Duplicated byte-for-byte into the resume skill, which re-enters this loop at the resume wave, because every skill directory is self-contained; `scripts/validate-plugin.mjs` fails the build when the copies diverge. Edit both together and keep the section names and their behavior stable.

---

## Execution Loop

For each wave, in order:

### 1. Parallel Execution

Launch a worker for EVERY **task-executor** in this wave in one batch, using whatever parallel delegation the client provides — the wave is the unit of parallelism, so do not walk the parents one at a time when the client can run them together. A client with no parallel delegation runs them sequentially and still finishes the whole wave before the next step. Later re-launches for PLAN_ISSUE, validation failures, or NEEDS_FIXES are separate and are covered below.

**Delivery order** (same behavioral contract; stronger hosts keep stronger primitives):

1. **Registered native agent** — if this client exposes a plugin/native agent named `task-executor` (Claude Code does), launch that. Native discovery, isolated context, and Claude model metadata (`model: opus`) come with the registration.
2. **Generic subagent + canonical body** — otherwise launch a generic subagent / worker and inject `references/agents/task-executor.md` from this skill directory as its full instructions. Prefer the client's strongest available coding model when the client lets you pin a model; otherwise inherit.
3. **Inline** — if the client has no subagent/worker primitive, execute that same protocol in this session.

Each worker receives: parent display ID, subtask display IDs in order, brief slug, account slug, and the paths to `brief.md` and `spec.md` in the brief's `.hamster/{account}/briefs/{slug}/` folder (`spec.md` is absent when the brief has no spec; then the brief alone is the authority). Do not summarise either file for the executor, and tell it: "Read `brief.md` and `spec.md` in full before your first change. The brief says what the user sees; the spec says what is reused. A task that contradicts either is a PLAN_ISSUE, not an instruction." Executors load project skills and discover codebase context themselves — do not pre-chew context for them.

Wait for all to complete; collect each executor's file list, deviations, and any PLAN_ISSUE.

**Handling PLAN_ISSUE** (resolved authority-correct work or unresolved/skipped work):

1. Verify the claim yourself — read the cited brief/spec, code, and task; executors can be wrong too.
2. **Resolved and built against unambiguous brief/spec authority**: retain the resolution for review and feedback; do not re-launch or ask permission merely because the corrected implementation differs from the task. Authority corrections must respect executor ownership and the existing overlapping/shared-file stop; they do not authorize conflicting edits. If all required work is complete and no issue remains unresolved, the parent can be `done`.
3. **Unresolved, local fix within the same authority and scope** (stale assumption with an obvious safe implementation): re-launch that task-executor with the corrected instruction; leave the parent `in_progress` until the affected work is complete.
4. **Actual scope, API, or user-visible behavior change beyond brief/spec authority, an unresolved decision, or an obsolete task without a clear authoritative resolution**: ask the user with the executor's recommendation as the lead option. Never offer an unsafe or authority-contradicting implementation as a valid choice, and never silently drop or rewrite required work.
5. Record whether each issue is resolved or unresolved and what was built or skipped; retain prior resolutions across waves and resumes. Surface all plan issues and deviations in the final report and PR body.

Tier 1/2 deviations (documented adaptations with unchanged outcome) need no action here — the wave reviewer judges them.

### 2. Validate + Test (once per wave)

First, run the repo's formatter in write mode — discover it from the repo's own scripts and tooling config, and pick the variant that fixes files, not the `--check` one. Formatting is a separate CI gate from lint in many repos; skipping it ships red PRs even when lint passes. Formatter rewrites are part of the wave: they land in each parent's staged files at commit time.

Then checks and tests:

```bash
# Detect tooling; run checks then tests
if [ -f "package.json" ]; then
  pm=$(command -v pnpm >/dev/null && echo pnpm || (command -v yarn >/dev/null && echo yarn || echo npm))
  $pm run typecheck 2>/dev/null; $pm run lint 2>/dev/null; $pm test 2>/dev/null
elif [ -f "Cargo.toml" ]; then cargo check && cargo clippy 2>/dev/null && cargo test
elif [ -f "go.mod" ]; then go build ./... && go vet ./... && go test ./...
elif [ -f "Makefile" ]; then make check 2>/dev/null; make test 2>/dev/null
fi
```

- Validation errors → edit the files directly (type errors, imports); re-launch a task-executor only for substantive failures
- Test failures → STOP, report, ask user: fix or skip

### 3. Wave Review

**Fast path**: if the wave diff is small (< ~150 changed lines) AND touches no sensitive areas, review it yourself inline using the same `references/agents/wave-reviewer.md` protocol, including full reads of `brief.md` and any `spec.md`, its authority hierarchy, deviation/PLAN_ISSUE audit, and per-parent verdicts — no agent needed. Sensitive areas: auth, payments, migrations, security, CI workflows (`.github/workflows/`), env/secret config files, public API type definitions, and new dependencies (additions to package manifests — version bumps alone don't count).

Otherwise launch one isolated **wave-reviewer** with: wave number, parent IDs, per-parent file lists, per-parent deviations and PLAN_ISSUEs (including resolution and built/skipped work), and the paths to `brief.md` and `spec.md` (not a summary). Same delivery order as task-executor: prefer the registered native `wave-reviewer` agent when the client exposes it (Claude keeps `model: sonnet`); otherwise launch a generic subagent and inject `references/agents/wave-reviewer.md` from this skill directory; otherwise review inline. On the generic path, prefer a mid-tier model when the client lets you pin one; otherwise inherit. It returns per-parent PASS/NEEDS_FIXES verdicts and applies simplifications for passing parents.

**NEEDS_FIXES handling** (per parent): small issues (1-3 files) → apply the change directly; larger → re-launch task-executor with the issue list. Max 2 review rounds, then report to user.

### 4. Commit Wave (bisectable, per parent, sequential)

For each parent: stage ONLY that parent's files (plus its simplifications). Split into logical commits when changes span concerns (infra → types → logic → UI → tests); a cohesive change gets one commit. `{KEY}-{id}` is the parent's display ID (`HAM-42`, `ACME-7`) and `{key}` its key lowercased, so subjects read `feat(ham-42): …` or `feat(acme-7): …`:

```bash
git add {specific files}
git diff --cached --name-only   # verify staging
git commit -m "feat({key}-{id}): {concise description}

- {key change}

Task: {KEY}-{id}
Brief: {slug}"
```

- **NEVER** `git add .` / `git add -A`; never stage `.env*`, `.hamster/.state.json`, keys/secrets
- Pre-commit hook fails → fix the issue, new commit; never `--no-verify`
- Simplification changes commit as `refactor({key}-{id}): simplify post-review`

### 5. Progress Report

```
Wave {n} complete: {KEY}-{id} ✓ ({c} commits), {KEY}-{id} ✓ ({c} commits)
Remaining: {n} waves, {n} parents
```

Non-interactive by default — only stop for: merge conflicts, test failures, critical review findings after 2 rounds, agent failures, or two executors having modified the same file (report and ask).

---

## Completion

Stop sync, then final validation. Only kill the watcher if YOU started it (numeric `sync_pid` from Setup) — substitute the literal PID; if `sync_pid` was `existing` or `unknown`, leave it running:

```bash
kill {literal-sync-pid} 2>/dev/null
# re-run the wave validation block above for a final full check
```

If the final formatter pass leaves a diff (e.g. from post-review edits), commit it before the PR: `git add -u && git commit -m "style: apply repository formatter"`.

**PR feedback aggregation is mandatory**: collect every executor's deviations and PLAN_ISSUEs across all waves, including earlier completed tasks on resume. Retain prior task completion and feedback resolutions from available reports and any existing PR body; merge new entries by task and issue, updating their resolution without erasing their history. Do not replace prior feedback with `None reported.` merely because this resumed wave has none. Only mark completed tasks checked; keep unresolved or unbuilt work explicit.

**PR** — First check whether this branch already has a PR (`gh pr view --json url,body`). If it does, push the completed commits and update its body with `gh pr edit --body` using the merged task status and Plan Feedback above; preserve the other existing body content and report its URL. A push alone does not update PR feedback. Only an explicit no-PR result establishes absence. On auth, network, or other lookup errors, skip the PR step: don't treat the PR as absent, don't ask to create one, and don't create or edit a PR. Keep the error for the final report and continue to the brief status update. If no PR exists, ask the user ("Create a PR?" yes/later). Only if yes, inline (no agent):

```bash
git push -u origin HEAD
gh pr create --base "$default_branch" --title "{brief title, <70 chars}" --body "$(cat <<'EOF'
## Summary
{1-3 sentences}

## Tasks
- [x] HAM-123: {title}
- [x] HAM-124: {title}

## Changes
{grouped by area}

## Plan Feedback

### Deviations

{every place the build differs from a task, the brief, or the spec: task id, what changed, why — or `None reported.`}

### PLAN_ISSUEs

{each PLAN_ISSUE: task id, what it contradicted in `brief.md` or `spec.md`, resolved/unresolved, what was built or left unbuilt, and the resolution or pending decision — or `None reported.`}

Brief: {slug}
EOF
)"
```

Then update brief status and report:

```bash
hamster brief status ${slug} delivering
```

```
Brief shipped: {title}
  Branch: {branch} | PR: {url, skipped, or "lookup failed: {error}"}
  Tasks: {n}/{total} | Waves: {n} | Commits: {n}
  Plan feedback: {n deviations, n plan issues — or "none"}
```
