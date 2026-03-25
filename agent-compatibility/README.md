# Agent Compatibility Cursor Plugin

This is a thin Cursor plugin that wraps the published `agent-compatibility` CLI.

The top-level skill is intentionally thin. It coordinates one subagent per check and then synthesizes the results.

All review agents are expected to return the same basic shape in **plain text** (no markdown code fences or heading syntax):

- First line: `<Score Name>: <score>/100`
- Short summary paragraph
- Line `Problems` then one issue per line prefixed with `- `

The orchestration skill (`run-agent-compatabilty`) answers the user with a minimal markdown result: one `## Agent Compatibility Score: N/100` heading and one flat `Problems / suggestions` list, with no formula or component scores unless the user asks for a breakdown.

## What is in here

- `.cursor-plugin/plugin.json`: plugin manifest
- `skills/run-agent-compatabilty/SKILL.md`: thin orchestration skill for the full pass
- `agents/deterministic-scan-review.md`: deterministic CLI scan agent
- `agents/startup-review.md`: startup verification agent
- `agents/validation-review.md`: validation-loop agent
- `agents/docs-reality-review.md`: docs-vs-reality agent

## How it works

The plugin does not embed the scanner. It expects Cursor to run the published npm package when needed:

```bash
npx -y agent-compatibility@latest --json .
```

Or, when a Markdown report is easier to reason about:

```bash
npx -y agent-compatibility@latest --md .
```

## Local install

If you want to use this plugin directly, symlink this plugin directory into:

```bash
~/.cursor/plugins/local/agent-compatibility
```

## Recommended usage

Use `run-agent-compatabilty` when you want the full pass. That skill should fan out to:

- `deterministic-scan-review`
- `startup-review`
- `validation-review`
- `docs-reality-review`

The score names should be:

- `Agent Compatibility Score`
- `Startup Compatibility Score`
- `Validation Loop Score`
- `Docs Reality Score`

## Notes

- The top-level synthesis combines both layers:
  - it computes an internal workflow score from startup, validation, and docs-reality
  - `Agent Compatibility Score` = `round((deterministic * 0.7) + (workflow * 0.3))`
- The default final user-facing output is intentionally simple: one `Agent Compatibility Score` heading and one flat prioritized `Problems / suggestions` list, with no calculation shown.
- The skill is intentionally thin. The agents do the work.
- The CLI remains the scoring engine.
- If you later want tighter integration, the next step is an MCP server that exposes the scanner as structured tools instead of shell commands.
