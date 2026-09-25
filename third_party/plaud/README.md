# Plaud

Cursor plugin that connects agents to [Plaud](https://www.plaud.ai) through Plaud's official [Model Context Protocol](https://modelcontextprotocol.io/) server, run locally by Cursor.

Search recordings, pull transcripts and AI notes, and draft follow-ups from meeting action items without leaving the agent.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Plaud**.
3. Click **Install**, then ask the agent to log you into Plaud.

Or run `/add-plugin plaud` in chat.

## MCP

```json
{
  "mcpServers": {
    "plaud": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@plaud-ai/mcp@latest"
      ]
    }
  }
}
```

Plaud does not publish a hosted MCP endpoint for Cursor. Its official server runs locally over stdio and authenticates with browser OAuth — ask the agent to **log me into Plaud**, which opens Plaud's authorize page via the `login` tool.

## Before you connect

1. Install [Node.js](https://nodejs.org/) 20 or newer so `npx` is on your PATH.
2. Have a Plaud account.
3. After installing the plugin, ask the agent: `Log me into Plaud`. Complete Authorize in the browser, then return to Cursor.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Auth | `login`, `logout`, `get_current_user` |
| Recordings | `list_files` (keyword / date filters), `get_file` |
| Notes & transcripts | `get_note`, `get_transcript` |

The npm package is the source of truth for tool names and schemas.

## Notes

- This is a local stdio server, so `npx` has to be available on the machine running Cursor. It downloads `@plaud-ai/mcp` on first run.
- Claude Web and ChatGPT Web use separate hosted Plaud connectors; this plugin is the Cursor/local stdio path from [Plaud's MCP docs](https://docs.plaud.ai/plaud-mcp-cli/mcp).
- Tokens are stored under `~/.plaud` by the official server. If refresh fails, delete `~/.plaud/tokens-mcp.json` and sign in again.
- Tool calls run as the Plaud user who authorizes the connection.

## Docs

- Plaud MCP: https://docs.plaud.ai/plaud-mcp-cli/mcp
- npm package: https://www.npmjs.com/package/@plaud-ai/mcp

## License

MIT
