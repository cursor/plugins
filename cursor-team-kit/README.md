# Cursor Team Kit plugin

<!-- cursor-plugin-enhancements:begin -->

## Who this is for

### For you (user level)
You borrow Cursor’s own muscle memory for “CI red → fix → green → ship,” including conflict resolution and PR hygiene, without inventing your own checklist each time.

### For your projects (project level)
Teams that live in GitHub PRs and Actions get repeatable playbooks for loop-on-CI, smoke tests, and merge-ready diffs—especially valuable under time pressure.

### Best suited for
- Repositories with active GitHub Actions (or similar CI)
- Contributors who want opinionated, battle-tested shipping skills
- Maintainers drowning in flaky checks and noisy AI-generated diffs

<!-- cursor-plugin-enhancements:end -->

Internal-style workflows for CI, code review, shipping, and test reliability.

## Installation

```bash
/add-plugin cursor-team-kit
```

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `loop-on-ci` | Watch CI runs and iterate on failures until checks pass |
| `review-and-ship` | Run a structured review, commit changes, and open a PR |
| `pr-review-canvas` | Generate an interactive HTML PR walkthrough with annotated, categorized diffs |
| `run-smoke-tests` | Run Playwright smoke tests and triage failures |
| `fix-ci` | Find failing CI jobs, inspect logs, and apply focused fixes |
| `new-branch-and-pr` | Create a fresh branch, complete work, and open a pull request |
| `get-pr-comments` | Fetch and summarize review comments from the active pull request |
| `check-compiler-errors` | Run compile and type-check commands and report failures |
| `what-did-i-get-done` | Summarize authored commits over a given time period into a concise status update |
| `weekly-review` | Generate a weekly recap of shipped work with bugfix/tech-debt/net-new highlights |
| `fix-merge-conflicts` | Resolve merge conflicts, validate build/tests, and summarize decisions |
| `deslop` | Remove AI-generated code slop and clean up code style |

### Agents

| Agent | Description |
|:------|:------------|
| `ci-watcher` | Monitor GitHub Actions runs and return concise pass/fail summaries |

### Rules

| Rule | Description |
|:-----|:------------|
| `typescript-exhaustive-switch` | Require exhaustive switch handling for unions/enums |
| `no-inline-imports` | Keep imports at module top-level for readability and consistency |

## License

MIT
