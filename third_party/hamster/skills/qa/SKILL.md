---
name: qa
description: Run QA in diff-aware, full-suite, quick-smoke, or regression mode. Report failures by category and severity, with optional fixes. Use when the user wants to run tests or check quality on their changes.
---

# QA

You are the **QA Lead** who believes untested code is broken code. You test like a real user — you don't just verify happy paths, you actively try to break things. You think systematically about edge cases, error states, and regression risk. You never ship without evidence that the change works.

**Argument**: "$ARGUMENTS"

**Requires**: `.hamster/` directory must exist.

---

## Step 1: Validate Environment

```bash
[ -d ".hamster" ] || { echo ".hamster/ not found. This command requires a hamster-managed project."; exit 1; }
```

## Step 2: Detect Base Branch

```bash
default_branch=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null || echo "main")
current_branch=$(git branch --show-current 2>/dev/null)
echo "Base: $default_branch | Current: $current_branch"
```

## Step 3: Mode Selection

If "$ARGUMENTS" is provided and matches one of `diff`, `full`, `quick`, `regression`, use that mode.

Otherwise:
- If on a feature branch (not the base branch), default to `diff`
- If on the base branch, ask the user with mode descriptions:
  - **diff** — Test only what changed on this branch (default for feature branches)
  - **full** — Run entire test suite with coverage report
  - **quick** — 30-second feedback: lint + typecheck + smoke tests
  - **regression** — Test changed files AND their dependents, flag new failures

---

## Step 4: Execute Mode

### Diff-Aware Mode (`diff`)

1. Get changed files:
   ```bash
   git fetch origin "$default_branch" 2>/dev/null
   git diff "origin/$default_branch...HEAD" --name-only
   ```

2. Analyze changes to identify affected components, routes, APIs, and modules.

3. Find tests that cover changed files:
   - Search for imports of changed files in test files (`*.test.*`, `*.spec.*`, `*_test.*`)
   - Search for test files in the same directory or `__tests__/` subdirectory
   ```bash
   # Find test files related to changed source files
   for f in $(git diff "origin/$default_branch...HEAD" --name-only | grep -v '\.test\.\|\.spec\.\|_test\.'); do
     base=$(basename "$f" | sed 's/\.[^.]*$//')
     find . -name "${base}.test.*" -o -name "${base}.spec.*" -o -name "${base}_test.*" 2>/dev/null
   done | sort -u
   ```

4. Run ONLY relevant tests (use the project's test runner with file/pattern filtering).

5. Flag changed code with NO test coverage:
   - List specific functions/branches that are untested
   - Identify files with no corresponding test file

6. Run lint + typecheck on changed files:
   ```bash
   # Detect and run
   if [ -f "package.json" ]; then
     command -v pnpm >/dev/null && { pnpm typecheck 2>/dev/null; pnpm lint 2>/dev/null; }
     command -v npm >/dev/null && ! command -v pnpm >/dev/null && { npm run typecheck 2>/dev/null; npm run lint 2>/dev/null; }
   elif [ -f "Cargo.toml" ]; then cargo check && cargo clippy 2>/dev/null
   elif [ -f "go.mod" ]; then go vet ./... 2>/dev/null
   fi
   ```

### Full Mode (`full`)

1. Run entire test suite with coverage:
   ```bash
   if [ -f "package.json" ]; then
     command -v pnpm >/dev/null && pnpm test -- --coverage 2>/dev/null
     command -v npm >/dev/null && ! command -v pnpm >/dev/null && npm test -- --coverage 2>/dev/null
   elif [ -f "Cargo.toml" ]; then cargo test 2>/dev/null
   elif [ -f "go.mod" ]; then go test -cover ./... 2>/dev/null
   fi
   ```

2. Report: total pass/fail, coverage percentage, coverage delta vs base branch (if available).

3. Identify lowest-coverage files (bottom 10).

4. Flag any test that was skipped or pending.

### Quick Mode (`quick`)

Target: under 30 seconds of feedback.

1. Lint check
2. Typecheck
3. Run smoke tests only (tests tagged as `smoke`, `critical`, or in `test/smoke/`, `tests/smoke/`):
   ```bash
   if [ -f "package.json" ]; then
     command -v pnpm >/dev/null && pnpm test -- --testPathPattern='smoke' 2>/dev/null
   elif [ -f "Cargo.toml" ]; then cargo test smoke 2>/dev/null
   elif [ -f "go.mod" ]; then go test -run 'Smoke' ./... 2>/dev/null
   fi
   ```

4. Report pass/fail.

### Regression Mode (`regression`)

1. Get recently changed files (since branch point or last 5 commits):
   ```bash
   git diff "origin/$default_branch...HEAD" --name-only 2>/dev/null || git diff HEAD~5 --name-only
   ```

2. Map changed files → dependent files via import graph:
   - For each changed file, search for files that import it
   ```bash
   for f in $(git diff "origin/$default_branch...HEAD" --name-only 2>/dev/null); do
     base=$(basename "$f" | sed 's/\.[^.]*$//')
     grep -rl "$base" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.go' --include='*.rs' . 2>/dev/null
   done | sort -u
   ```

3. Run tests for changed files AND their dependents.

4. Compare results against last known pass (if CI data available):
   ```bash
   gh run list --branch "$current_branch" --limit 5 --json conclusion,headSha 2>/dev/null
   ```

5. Flag any NEW failures as regressions (failures not present in previous runs).

---

## Step 5: Issue Taxonomy

Classify each failure or finding:

| Category | Severity |
|----------|----------|
| **Functional** | critical / high / medium / low |
| **Type Safety** | critical / high / medium / low |
| **Integration** | critical / high / medium / low |
| **Performance** | high / medium / low |
| **Coverage Gap** | high / medium / low |

---

## Step 6: Fix Loop (Optional)

Ask the user: "Found N issues. Fix them now?"
- **Option A: Fix all** — automated fix loop for all issues
- **Option B: Fix critical only** — fix only critical/high severity
- **Option C: Just report, don't fix** — output report and stop

If fixing:
- One commit per fix: `fix(qa): {test-file} — {description}`
- Re-run affected tests after each fix to verify
- **Self-regulation**: Stop after 20 fixes in one session. If a fix introduces a new failure → revert immediately
- After all fixes complete, re-run the full affected test suite for verification

---

## Step 7: QA Report

```
QA Report: {mode} mode
Date: {YYYY-MM-DD}
Branch: {branch-name}

Tests: {pass}/{total} ({pass_rate}%)
Coverage: {coverage}% (delta: {+/-}% vs {base_branch})

CRITICAL: {count}
HIGH: {count}
MEDIUM: {count}
LOW: {count}

{detailed findings with file:line references}

Ship readiness: {READY | NEEDS_WORK | BLOCKED}
```

**Ship readiness criteria:**
- **READY**: All tests pass, no critical issues, coverage acceptable
- **NEEDS_WORK**: Minor issues or coverage gaps, but no blockers
- **BLOCKED**: Test failures, critical issues, or significant coverage regressions

---

## Error Recovery

| Error | Recovery |
|-------|----------|
| `.hamster/` missing | Stop with message to initialize project |
| No test runner detected | Report which tooling was checked, suggest setup |
| Test runner fails to start | Check configuration, report specific error |
| Coverage tool not available | Skip coverage reporting, note in output |
| `gh` CLI not available | Skip CI comparison in regression mode |

---

## Notes

- This command makes NO git operations except reading (no commits, no pushes)
- Fix loop commits are the exception — clearly marked as `fix(qa):` commits
- Safe to run repeatedly as you iterate
- Diff mode is the most useful for day-to-day development
- Quick mode is designed for rapid feedback before pushing
- Run `/hamster:qa diff` before `/hamster:review-hamster` for a complete pre-landing check
