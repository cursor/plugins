# Create plugin

Meta workflows for creating Cursor plugins that are marketplace-ready.

## Installation

```bash
/add-plugin create-plugin
```

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `create-plugin-scaffold` | Scaffold a new plugin directory with manifest, components, and repository wiring |
| `review-plugin-submission` | Run a pre-submission quality check against marketplace expectations |

### Rules

| Rule | Description |
|:-----|:------------|
| `plugin-quality-gates` | Keep plugin manifests, component metadata, and paths valid and consistent |

### Agents

| Agent | Description |
|:------|:------------|
| `plugin-architect` | Design plugin structure and component mix based on a concrete use case |

## Typical flow

1. Ask the agent to scaffold a plugin, giving a name, purpose, and target component types; the `create-plugin-scaffold` skill drives the work, and the `plugin-architect` agent can help choose the component mix first.
2. Generate or update `plugin.json`, then add rules/skills/agents/commands as needed.
3. Run `review-plugin-submission` before publishing or marketplace submission.

## License

MIT
