---
name: resume-hamster
description: Resume an interrupted brief execution. Reconstruct progress from git history and task statuses, then continue from the right execution wave. Use when the user wants to continue an interrupted ship session.
---

# Resume Brief Execution

Resumes an interrupted `/hamster:ship` session. Reconstructs state from task statuses, git log, and git status — no state file needed. Like `/hamster:ship`, this is execution-only: it continues the pre-generated plan in `.hamster/` and never replans.

**Argument**: "$ARGUMENTS"

---

## Readiness

Before assuming a Hamster CLI, run this skill's bundled gate. Set `SKILL_DIR` to the absolute path of the directory holding the SKILL.md you just read — the shell's working directory is the user's project, not this skill — and keep the whole command on one line with its statements `;`-separated, because some clients flatten a fenced block before running it. The `else` branch is the same gate inline, for clients that expose no readable path to the installed package.

Unix:

```bash
SKILL_DIR="<absolute path of the directory containing this SKILL.md>"; if [ -f "$SKILL_DIR/scripts/ensure-ready.sh" ]; then bash "$SKILL_DIR/scripts/ensure-ready.sh"; else export PATH="$HOME/.hamster/bin:$PATH"; if command -v hamster >/dev/null 2>&1 && { status_err="$(hamster --no-tui status 2>&1)"; printf '%s' "$status_err" | grep -q "Logged in" || { printf '%s\n' "$status_err" >&2; false; }; } && sync_err="$(hamster sync 2>&1)"; then echo READY; else [ -n "${sync_err:-}" ] && printf '%s\n' "$sync_err" >&2; echo SETUP_NEEDED; exit 1; fi; fi
```

Windows:

```powershell
$SkillDir = "<absolute path of the directory containing this SKILL.md>"; if (Test-Path "$SkillDir\scripts\ensure-ready.ps1") { pwsh "$SkillDir\scripts\ensure-ready.ps1" } else { $env:PATH = "$env:USERPROFILE\.hamster\bin;" + $env:PATH; if (Get-Command hamster -ErrorAction SilentlyContinue) { $status = & hamster --no-tui status 2>&1 | Out-String; if ($LASTEXITCODE -eq 0 -and $status -cmatch "Logged in") { $syncOut = & hamster sync 2>&1; if ($LASTEXITCODE -eq 0) { "READY" } else { [Console]::Error.WriteLine(($syncOut | Out-String).TrimEnd()); "SETUP_NEEDED"; exit 1 } } else { [Console]::Error.WriteLine($status.TrimEnd()); "SETUP_NEEDED"; exit 1 } } else { "SETUP_NEEDED"; exit 1 } }
```

If it prints `SETUP_NEEDED` in Codex on macOS and `hamster` is already on `PATH`, re-run only this readiness command with elevated permission. The default workspace sandbox cannot read Keychain credentials, and an extra directory grant does not change that. If the elevated check prints `READY`, continue. Only if it still prints `SETUP_NEEDED`, run this plugin's `setup` skill, then re-run the check. Do not continue until it prints `READY`.

## Detect the Brief

Read [brief-selection](references/brief-selection.md) and run **Account Resolution** first. On `ACCOUNT_UNRESOLVED`, follow its team-selection/re-sync guidance and stop. Then use the resolved filesystem slug (shell-quoted) in one bash call for live sync and all three detection signals:

```bash
account="<resolved filesystem account slug>"
repo=$(git rev-parse --show-toplevel 2>/dev/null)
watch=""
for pid in $(pgrep -f "hamster sync .*--watch" 2>/dev/null); do
  cwd=$(lsof -a -d cwd -p "$pid" -Fn 2>/dev/null | sed -n 's/^n//p' | head -1)
  [ -z "$cwd" ] && cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null)
  [ "$cwd" = "$repo" ] && { watch="existing"; break; }
  [ -z "$cwd" ] && watch="unknown"
done
if [ -n "$watch" ]; then echo "account=${account} sync_pid=${watch}"
else hamster sync --watch > /dev/null 2>&1 & echo "account=${account} sync_pid=$!"; fi
# sync_pid: "existing"/"unknown" → a watcher is already running, reuse it and never kill it;
# numeric → remember the literal number (fresh shell per Bash call)
# Signal A: current branch
git branch --show-current
[ -d ".hamster/${account}/briefs" ] || { echo "ACCOUNT_UNRESOLVED: .hamster/${account}/briefs does not exist; re-run Account Resolution and use the literal slug it prints"; exit 1; }
# Signal B: briefs with in_progress tasks
for tasks_dir in .hamster/${account}/briefs/*/tasks; do
  [ -d "$tasks_dir" ] || continue
  matches=$(grep -l '^status: "in_progress"' "$tasks_dir"/*.md 2>/dev/null)
  [ -n "$matches" ] && echo "in_progress: $(basename "$(dirname "$tasks_dir")")"
done
```

Resolution order:
1. **Argument provided** → run **Brief Selection → If argument provided** in [brief-selection](references/brief-selection.md) and use its resolved `$slug`. If selection asks, wait for the user's answer; do not fall through to the signals below. With no argument, use steps 2–4 instead of that reference's no-argument picker.
2. **Branch matches** `feature/{key}-{n}-{slug}` (`{key}` is the tasks' display ID key, lowercased, e.g. `ham`, `acme`) → extract the slug
3. **One brief** has in_progress tasks → use it; **multiple** → ask the user
4. **None** → tell the user nothing to resume; suggest `/hamster:ship`

---

## Find the Resume Point

Read [brief-selection](references/brief-selection.md) and run its **Scheduling** step (the inline frontmatter parse + wave grouping). Then overlay git state in one call:

```bash
# Committed parents, as display IDs (HAM-42, ACME-7)
git log --format=%s | grep -oE '^feat\([a-z][a-z0-9]*-[0-9]+\)' | sed -E 's/^feat\((.*)\)$/\1/' | tr a-z A-Z | sort -u
# Uncommitted in-flight work
git status --porcelain
```

Walk the waves in order:
- All parents in a wave committed → wave complete, skip
- Some committed → partial wave: resume only the uncommitted parents
- None committed → resume from the start of this wave
- A task `in_progress` with uncommitted changes → it was interrupted mid-execution; pass a note to its executor to check `git diff` and continue from the partial work rather than restarting

Report compactly and ask the user to confirm ("Resume from Wave {n}?" / "Start from a different task" / "Cancel"):

```
Resuming: {title}
  Done:  Wave 1 — HAM-100, HAM-300 (committed)
  Next:  Wave 2 — HAM-200 (todo), HAM-400 (in_progress, has uncommitted changes)
  Remaining: {n} parents across {m} waves
```

---

## Continue

Verify the branch first: if not on `feature/{key}-{n}-{slug}`, ask whether to switch or create it.

Dirty working tree not attributable to an in_progress task → show the changes, ask: commit as part of current task / stash / discard.

Then read [execution-loop](references/execution-loop.md) and run its **Execution Loop** and **Completion** sections exactly as written, starting at the resume wave (partial waves: launch executors only for uncommitted parents). At completion, an existing PR needs both a push and a body update: merge resumed task statuses and Plan Feedback with its prior entries and resolutions, preserving other existing content, and report its URL. If no PR exists, keep the loop's user consent before creating one.
