# Harness-aware model routing

Pstack reads `~/.config/pstack/models.json` at the start of a workflow. Select the
profile for the **active harness**, identified from the tools in this session
(for example Cursor `Task`, Claude Code `Task`, Codex `spawn_agent`, or OpenCode
agents). A CLI installed on the machine does not make it the active harness.
When no matching profile exists, use the legacy Cursor rule
(`~/.cursor/rules/pstack-models.mdc`) and skill defaults **only in Cursor**.
In another harness, use native `inherit-parent` entries until setup confirms
models for that harness. Never feed Cursor model slugs to a different harness
merely because the legacy rule exists.

The profile is a JSON object with `schemaVersion: 1` and `profiles` keyed by
`cursor`, `claude-code`, `codex`, or `opencode`. Each profile has a `budget`, a
native `fallback`, and `roles`. Every role value is an ordered array, including
single-model roles. An entry has `runner`, `model`, and `effort` fields:

```json
{
  "schemaVersion": 1,
  "profiles": {
    "codex": {
      "budget": "medium",
      "fallback": { "runner": "native", "model": "inherit-parent", "effort": null },
      "roles": {
        "feature, refactoring": [
          { "runner": "native", "model": "gpt-6-sol", "effort": "high" }
        ],
        "interrogate reviewers": [
          { "runner": "native", "model": "gpt-6-astra", "effort": "high" },
          { "runner": "claude-cli", "model": "opus", "effort": "high" }
        ]
      }
    }
  }
}
```

The example illustrates the format; setup must verify each real model and
runner before writing it. `inherit-parent` and `auto` are always valid **native**
models and omit the model override. A panel role runs one reviewer per entry;
`arena cross-judge pool` instead selects one entry, preferring a family different
from the parent when available. `swarm workers` is one default entry unless a
race explicitly names other arms.

## Resolve an entry

1. Prefer `native` when this harness's subagent tool accepts the chosen model.
   Pass model and effort using that tool's actual schema. Codex has separate
   `model` and `reasoning_effort` inputs; do not invent an effort-suffixed slug.
   Cursor may encode effort in a model variant. Omit unsupported effort fields.
   The consuming skills' `Task` examples may contain Cursor-only options such
   as `subagent_type`, `readonly`, `environment`, and `run_in_background`.
   In Cursor, pass them as written. In another harness, translate them with
   [Harness reference](#harness-reference) rather than passing unsupported
   fields.
2. `claude-cli`, `codex-cli`, `cursor-cli`, and `opencode-cli` are external runners.
   Use them for read-only review, investigation, or adversarial work only when
   the CLI is authenticated, the model is confirmed runnable, and a read-only
   mode is available. Check the installed CLI's `--help` before invoking it:
   Claude Code supports print mode and plan permissions; Codex supports
   `exec --sandbox read-only`; Cursor Agent supports print and plan modes;
   OpenCode supports `run --agent plan`. Set model and effort/variant only with
   options that CLI actually supports. Capture the result in a local artifact,
   report tool failures, and do not put credentials or private data in command
   arguments or logs.
   Give an external reviewer only source and context approved for that provider
   under the project's data rules. If a native tool cannot enforce read-only
   access, use a confirmed read-only external runner or verify its checkout
   remained unchanged after an explicitly no-edit native review.
3. Open-source models can use a native subagent, an authenticated OpenCode
   provider, or a loaded local Codex/Ollama/LM Studio provider. A catalog entry
   alone does not prove access. Record the runner that actually accepts it.
4. Code-writing roles use `native` by default. An external writer needs explicit
   user selection, an isolated checkout, and a documented write boundary.
   Never run multiple writers against one checkout.
5. If a configured runner or model is unavailable, say which entry failed and
   use the profile's confirmed native fallback. Do not silently substitute a
   different model family or claim a cross-family review occurred.

For Codex, favor confirmed GPT models for implementation and use a confirmed
Claude, Grok, or other family for read-only review when it has a runnable entry.
For Claude Code, favor confirmed Claude models for implementation and use a
confirmed GPT, Grok, or other family for review. Cursor and OpenCode select
their native primary family from the active session. When the native subagent
tool exposes all desired families, use it for the whole panel; external CLIs
are a fallback for families absent from that tool.

## Harness reference

Skills and agents are written with Cursor's names, fields, and paths. In
Cursor, use them exactly as written. In another harness, translate each one
with the tables below. Drop a field with no row here and say you dropped it;
never invent a field or value the active tool's schema does not accept.

### Subagent fields

| Cursor | Claude Code |
| --- | --- |
| `subagent_type: generalPurpose` | `subagent_type: "general-purpose"` |
| `subagent_type: poteto-agent`, `comment-sicko`, or another pstack agent | Prefix the plugin name: `pstack:poteto-agent`, `pstack:comment-sicko` |
| `readonly: true` | `subagent_type: "Explore"`. It denies `Write` and `Edit` but keeps shell access, so also instruct no edits and confirm the checkout is unchanged afterward. |
| `readonly: false` (for MCP access) | `general-purpose`, which inherits the session's MCP servers |
| `environment: "cloud"` | `isolation: "remote"` when the tool offers it, else `isolation: "worktree"`. A worktree branches from the default branch, not the parent's `HEAD`, so tell the subagent which branch or commit to check out. |
| `environment: "local"` | Omit the field. |
| `run_in_background: true` | Omit the field. Claude Code runs subagents in the background in interactive sessions. |
| Effort-suffixed model slug, such as `claude-opus-5-5-xhigh` | Separate `model` and `effort` (`low` through `max`). The call's `model` accepts only the aliases `opus`, `sonnet`, `haiku`, and `fable`. |
| `inherit-parent` or `auto` | Omit `model`. Never pass `inherit` on a call; only agent frontmatter accepts it. |

### Agent frontmatter

Claude Code ignores frontmatter keys it does not recognize, so an agent file
carries both harnesses' keys side by side.

| Cursor | Claude Code |
| --- | --- |
| `is_background: true` | `background: true` |
| `readonly: true` | `disallowedTools: Write, Edit`. Plugin agents ignore `permissionMode`. |
| `model: inherit` | `model: inherit` |

### Paths and names

| | Cursor | Claude Code |
| --- | --- | --- |
| Plugin install root | `~/.cursor/plugins/` | `~/.claude/plugins/` |
| Installed plugin manifest | `.cursor-plugin/plugin.json` | `.claude-plugin/plugin.json` |
| Project skills | `.cursor/skills/` | `.claude/skills/` |
| User skills | `~/.cursor/skills/` | `~/.claude/skills/` |
| Slash command | `/poteto-mode` | `/pstack:poteto-mode` |
| Transcript directory | `~/.cursor/projects/<slug>/agent-transcripts/`, named in the system prompt | `~/.claude/projects/<slug>/`, not named in the system prompt |
| Transcript file | `<uuid>/<uuid>.jsonl` | `<uuid>.jsonl`; subagents under `<uuid>/subagents/agent-<id>.jsonl` |
| Workspace slug | Workspace path without the leading `/`, with each `/` turned into `-` | Workspace path with each `/` and `.` turned into `-`, keeping the leading `-` |
| Slug example for `/Users/you/proj` | `Users-you-proj` | `-Users-you-proj` |

In Claude Code, the current session's transcript is the most recently modified
`.jsonl` directly under the workspace's project directory. Claude Code deletes
transcripts after `cleanupPeriodDays` (30 days by default). As in Cursor, read
only the active workspace's directory; never glob across every project.

Cursor Automations (`automations/`) have no Claude Code equivalent and stay
Cursor-only.
