# Unforgit Cursor Plugin

Unforgit gives Cursor durable, repository-scoped memory through MCP. Agents can remember and recall project decisions, conventions, gotchas, and reusable playbooks instead of rediscovering them in every session.

## Included

- MCP server registration for `unforgit-mcp`
- Cursor memory rules
- Unforgit memory skill
- Local-first setup guidance

## Requirements

Install the published CLI package so the MCP binary is on `PATH`:

```bash
npm install -g unforgit
```

Initialize Unforgit in your project if you have not already:

```bash
cd your-project
unforgit init --ide cursor
```

## Manual MCP config

```json
{
  "mcpServers": {
    "unforgit": {
      "command": "unforgit-mcp",
      "args": []
    }
  }
}
```

## Learn more

- Website: https://unforgit.com
- MCP docs: https://unforgit.com/docs/mcp
- Repository: https://github.com/MiguelMedeiros/unforgit
