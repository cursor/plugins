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

### Commands

| Command | Description |
|:--------|:------------|
| `create-plugin` | Build a new plugin scaffold with the right files and metadata |

## Typical flow

1. Use `/create-plugin` with a plugin name, purpose, and target component types.
2. Generate or update `plugin.json`, then add rules/skills/agents/commands as needed.
3. Run the repository validator before publishing or marketplace submission:

   ```bash
   npm install ajv ajv-formats
   node scripts/validate-plugins.mjs
   ```

## License

MIT
