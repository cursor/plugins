# Agent Compatibility

Cursor plugin for checking how well a repo holds up under agent workflows. It pairs the published `agent-compatibility` CLI with focused reviews for startup, validation, and docs reliability.

By default, the full pass returns one overall score and one short list of the highest-leverage fixes. If the user wants the full breakdown, the agents can expose the component scores and the reasoning behind them.

## What it includes

- `check-agent-compatibility`: full compatibility pass
- `compatibility-scan-review`: raw CLI-backed scan
- `startup-review`: cold-start and bootstrap review
- `validation-review`: small-change verification review
- `docs-reliability-review`: docs reliability review

## Score model

- `Agent Compatibility Score`: final blended score shown to the user
- `Deterministic Compatibility Score`: raw score from the published CLI
- `Startup Compatibility Score`: how much guesswork it takes to boot the repo
- `Validation Loop Score`: how practical it is to verify a small change
- `Docs Reliability Score`: how closely the docs match the real setup path

The final score blends the deterministic scan with the workflow checks:

```text
Agent Compatibility Score = round((deterministic * 0.7) + (workflow * 0.3))
```

The CLI also reports an accelerator layer for committed agent tooling. That extra context informs recommendations, but it does not inflate the deterministic compatibility score itself.

## How to use it

Use `check-agent-compatibility` when you want the full pass. That skill fans out to the four review agents above, then returns a compact result:

```md
## Agent Compatibility Score: 72/100

Top fixes
- First issue
- Second issue
```

Ask for a breakdown if you want the component scores or the weighting.

## CLI notes

The plugin does not bundle the scanner. It runs the published npm package when needed.

Default scan (compact terminal dashboard):

```bash
npx -y agent-compatibility@latest .
```

JSON output:

```bash
npx -y agent-compatibility@latest --json .
```

Markdown output:

```bash
npx -y agent-compatibility@latest --md .
```

Plain text output:

```bash
npx -y agent-compatibility@latest --text .
```

Config override for ignored paths or weight overrides:

```bash
npx -y agent-compatibility@latest . --config ./agent-compatibility.config.json
```

The scanner is heuristic. It scores repo signals and surfaces likely friction, but it is not a full quality verdict on the codebase.

## Local install

If you want to use this plugin directly, symlink this directory into:

```bash
~/.cursor/plugins/local/agent-compatibility
```
