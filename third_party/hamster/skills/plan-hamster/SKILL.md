---
name: plan-hamster
description: Analyze an existing Hamster brief and plan before building. Read its tasks, map dependencies, and group work into parallel waves, with optional CEO or Eng review. Use when the user wants to assess an existing brief and plan before building.
---

# Plan Brief

Read-only analysis of a Hamster Studio brief. Builds the dependency tree and wave schedule from the pre-generated plan in `.hamster/` — no code changes, no git operations, no status updates, and no task creation or elaboration. Optionally deep-dives with CEO Review (founder mode) or Eng Review (architecture mode).

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

## Select and Schedule

Read [brief-selection](references/brief-selection.md) and run **Account Resolution** first. On `ACCOUNT_UNRESOLVED`, follow its team-selection/re-sync guidance and stop. The resolved slug is the filesystem `$account`: shell-quote it into every block you run from that reference, and never use it as `HAMSTER_ACCOUNT_ID`.

Then follow **Brief Selection** and **Scheduling** in [brief-selection](references/brief-selection.md) exactly as written (argument parsing, brief picker, inline frontmatter parse, wave grouping) — but stop after producing the schedule; do not confirm execution.

Additionally read the brief body (`brief.md`) and skim the parent task bodies to inform the analysis below.

## Present the Analysis

- **Brief summary**: slug, status, task counts (done/remaining)
- **Dependency tree**: parents with their subtasks, statuses marked
- **Parallel waves**: with conflict reasons inline
  ```
  Wave 1 (parallel): HAM-100, HAM-300
  Wave 2:            HAM-200 (conflicts with HAM-100: both mention auth)
  ```
- **Risk flags**: high = auth/permissions/migrations/payments; medium = new endpoints/shared libraries; low = UI/docs/tests
- **PR strategy**: single PR (< 8 tasks, cohesive) vs. multiple (large/spanning domains)

---

## Mode Picker

Ask the user with 3 options:

1. **CEO Review (Founder Mode)** — rethink from first principles; deep 10-section review
2. **Eng Review (Architecture Mode)** — lock in architecture; 4 sections with diagrams and test plan
3. **Quick Analysis** — done; skip to Offer Transition

---

## CEO Review Mode

**Prime Directives**: zero silent failures; data flows mapped through 4 shadow paths (happy/nil/empty/error); observability is first-class scope; everything deferred gets written down.

**Step 0 — Scope Challenge** (ask the user): **SCOPE EXPANSION** (what's the 10-star version?), **HOLD SCOPE** (bulletproof execution; surface every risk), or **SCOPE REDUCTION** (strip to minimum value; defer the rest).

Work through 10 sections, asking the user for any critical finding that needs a decision:

1. **Architecture** — component dependency graph; data flow through the 4 paths; state machines for stateful transitions; integration points
2. **Error & Rescue Map** — table: method → exception → handler → what user sees; flag unhandled+untested+user-visible gaps; cascading failure risks
3. **Security & Threat Model** — auth boundaries, privilege escalation, input validation coverage, secret handling, trust boundaries
4. **Data Flow Edge Cases** — race conditions, stale data, cascading failures, TOCTOU
5. **Code Quality** — DRY across tasks, naming consistency, complexity hotspots
6. **Test Review** — test diagram for new UX/data/codepaths; untested critical paths; missing negative-path tests
7. **Performance** — N+1 risks, memory pressure, caching, latency budget
8. **Observability** — logs/metrics/traces needed; alerts; runbooks
9. **Deployment & Rollout** — migrations, feature flags, rollback plan, smoke tests
10. **Long-Term Trajectory** — tech debt introduced, path dependency, reversibility

**Output**: summary table (section → Clear / Issues Found / Needs Decision), unresolved decisions with tradeoffs, deferred items with reasoning. If EXPANSION was chosen: a **Delight Opportunities** section.

---

## Eng Review Mode

**Step 0 — Scope Challenge** (ask the user): **BIG CHANGE** (interactive, one section at a time, max 8 issues per section) or **SMALL CHANGE** (compressed single pass, one top issue per section).

4 sections:

1. **Architecture Lock-in** — ASCII data flow diagram, state management approach, API contracts, integration points, and a "what already exists" inventory of reusable patterns/services/types
2. **Code Quality** — DRY across planned changes, naming consistency, complexity hotspots, type safety gaps
3. **Test Strategy** — mandatory vs. nice-to-have tests, integration boundaries (mock vs. real); write a **Test Plan Artifact** to `.hamster/plans/{brief-slug}-test-plan.md`
4. **Performance** — N+1 detection, data fetching patterns, caching needs, latency analysis

**Issue resolution**: ask the user one question at a time; lead with the recommendation ("Do B. Here's why:"), 2-3 lettered options mapped to simplicity/correctness/performance tradeoffs.

**Output**: ASCII diagrams per major flow, test plan artifact, completion summary table, and an explicit **NOT-in-scope** section.

---

## Offer Transition

Ask the user: "Ship this brief?" — "Yes, ship now" → run `/hamster:ship {slug}`; "No, just planning" → end.

---

## Error Recovery

| Error | Recovery |
|-------|----------|
| `.hamster/` missing | Stop — run this plugin's `setup` skill, then retry |
| Account unresolved | Stop; follow Account Resolution's team-selection/re-sync guidance |
| Brief not found | Show partial matches, suggest closest |
| Malformed argument | Show usage examples, ask user to re-enter |
