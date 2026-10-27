# Larridin Work Context

Cursor plugin that connects agents to [Larridin](https://larridin.com/) Work Context through Larridin's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Larridin Work Context gives your agent governed context on how you work: recent projects, collaborators, meetings, and blockers, captured privately from your desktop apps. Access is read-only.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Larridin Work Context**.
3. Click **Install**, then complete the Larridin sign-in prompt.

Or run `/add-plugin larridin` in chat.

## MCP

```json
{
  "mcpServers": {
    "larridin": {
      "type": "http",
      "url": "https://app.larridin.com/mcp/larridin"
    }
  }
}
```

## Before you connect

You need a Larridin Work Context workspace where your admin has approved Cursor as a client.

## Notes

- Context is private by default and governed by your organization's policy. Admins choose which apps are captured and never see individual context.
- The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Larridin: https://larridin.com/
- Server URL: https://app.larridin.com/mcp/larridin

Logo is the Larridin mark from the `Larridin` GitHub organization avatar. larridin.com blocked automated requests when this plugin was added, so the file was not downloaded from the website.

## License

MIT
