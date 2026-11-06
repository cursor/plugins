# Thermos plugin

Thermo-nuclear branch review for Cursor agents: deep correctness and security audits, harsh maintainability rubrics, and parallel subagent orchestration.

## Installation

```bash
/add-plugin thermos
```

### Cursor CLI

Some Cursor CLI versions do not discover agents packaged in plugins. If `Task`
rejects `thermo-nuclear-review-subagent` or
`thermo-nuclear-code-quality-review-subagent` as an unknown subagent type:

1. Keep the Thermos plugin installed so its skills remain available.
2. Copy [thermo-nuclear-review-subagent.md](agents/thermo-nuclear-review-subagent.md)
   and [thermo-nuclear-code-quality-review-subagent.md](agents/thermo-nuclear-code-quality-review-subagent.md)
   from the plugin's `agents/` directory into your project's `.cursor/agents/`,
   preserving their filenames. Review any existing copies before replacing them.
3. Start a new Cursor CLI session from that project and invoke `thermos` again.

This workaround was confirmed on Linux and macOS in [issue #447](https://github.com/cursor/plugins/issues/447).

## Architecture

```mermaid
flowchart TB
  subgraph L2["Orchestrator"]
    TH[thermos]
  end

  subgraph L1["Subagents"]
    SNR[thermo-nuclear-review-subagent]
    SNCQ[thermo-nuclear-code-quality-review-subagent]
  end

  DIFF[git diff + file contents]

  subgraph L0["Skills"]
    TNR[thermo-nuclear-review]
    TNCQ[thermo-nuclear-code-quality-review]
  end

  TH --> SNR
  TH --> SNCQ
  SNR --> TNR
  SNR --> DIFF
  SNCQ --> TNCQ
  SNCQ --> DIFF
```

## Skills

| Skill | Description |
|:------|:------------|
| `thermo-nuclear-review` | Deep branch audit (bugs, breakages, security, devex, feature-gate leaks). |
| `thermo-nuclear-code-quality-review` | Strict maintainability audit (code-judo, 1k-line rule, spaghetti, boundaries). |
| `thermos` | Run both review subagents in parallel and synthesize findings. |

## Agents

| Agent | Description |
|:------|:------------|
| `thermo-nuclear-review-subagent` | Task subagent for deep review rubric (diff-scoped). |
| `thermo-nuclear-code-quality-review-subagent` | Task subagent for code-quality rubric (diff-scoped). |

## Typical usage

**Double review (thermos):**

1. Gather `git diff main...HEAD` and full contents of changed files.
2. Invoke both subagents in one message with `run_in_background: true`.
3. Synthesize prioritized, deduped findings.

**Single skill:** invoke `thermo-nuclear-review` or `thermo-nuclear-code-quality-review` in the main agent, or the matching subagent after gathering diff context.

## Migration from cursor-team-kit

`cursor-team-kit` previously included only `thermo-nuclear-code-quality-review`. That skill and agent now live in **Thermos** alongside deep review and `thermos`. Remove the old thermo entries from team-kit when you install this plugin to avoid duplicates.

## License

MIT
