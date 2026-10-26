# Agent Factory

Cursor plugin that connects agents to [Agent Factory (智能体工场)](https://agent.bitilinks.cn) by Bitilinks through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

List and create Agent Factory projects and tasks.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Agent Factory**.
3. Click **Install**, then open **Configure** and set `AF_CONNECTOR_TOKEN` to your Agent Factory personal access token (`afpat_…`).

Or run `/add-plugin bitilinks` in chat.

## MCP

```json
{
  "mcpServers": {
    "bitilinks": {
      "type": "http",
      "url": "https://agent.bitilinks.cn/api/connector/mcp",
      "headers": {
        "Authorization": "Bearer ${AF_CONNECTOR_TOKEN}"
      }
    }
  }
}
```

Auth is a Bearer personal access token. Sign in to Agent Factory, then issue a token with `POST https://agent.bitilinks.cn/api/connector/tokens` (the plaintext token is shown once). Each token is bound to the workspace it was issued in. Invalid or revoked tokens return `401`.

## What agents can do

| Tool | Purpose |
| --- | --- |
| `list_projects` | List projects |
| `create_project(name)` | Create a project |
| `rename_project(id, name)` | Rename a project |
| `list_tasks(project_id?)` | List your tasks |
| `create_task(title, project_id?)` | Create a task (without a project it goes to the inbox) |
| `update_task(id, title?, status?)` | Update a task's title or status |

The hosted runtime is the source of truth for tool names and schemas.

## Skill

- `agent-factory`: connecting to Agent Factory, the project and task tools, and example conversations (in Chinese).

## Docs

- Agent Factory: https://agent.bitilinks.cn
- Server URL: https://agent.bitilinks.cn/api/connector/mcp
- Source: https://github.com/bitlink0521/agent-factory-plugin

Logo is the Agent Factory mark from the publisher's repository (`assets/logo.png`, 512×512; `assets/logo.svg` is the source vector).

## License

MIT
