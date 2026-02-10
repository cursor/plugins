# Cursor Dev Kit Plugin

Cursor Dev Kit is a curated bundle of internal-style workflows used by Cursor developers for CI, code review, shipping, and test reliability.

## Installation

```bash
agent install cursor-dev-kit
```

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `loop-on-ci` | Watch CI runs and iterate on failures until checks pass |
| `review-and-ship` | Run a structured review, commit changes, and open a PR |
| `run-smoke-tests` | Run Playwright smoke tests and triage failures |

### Commands

| Command | Description |
|:--------|:------------|
| `fix-ci` | Find failing CI jobs, extract failures, and apply focused fixes |
| `new-branch-and-pr` | Wrap work in a clean branch workflow and open a PR |
| `get-pr-comments` | Fetch and summarize PR comments and review feedback |
| `check-compiler-errors` | Run project compile/type-check commands and report failures |
| `worktree` | Start work in a dedicated git worktree |
| `apply-worktree` | Apply committed worktree changes to the main worktree |

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
