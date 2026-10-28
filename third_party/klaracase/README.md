# klaracase

Cursor plugin that connects agents to [klaracase](https://klaracase.de) through klaracase's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Legal research for German law: more than 500,000 German court decisions, federal and state statutes, and selected EU legal acts.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **klaracase**.
3. Click **Install**, then complete the klaracase sign-in prompt and approve access on the consent page.

Or run `/add-plugin klaracase` in chat.

## MCP

```json
{
  "mcpServers": {
    "klaracase": {
      "type": "http",
      "url": "https://klaracase.de/mcp"
    }
  }
}
```

Auth is OAuth with dynamic client registration, so Cursor prompts for klaracase sign-in when the plugin connects — there is no client ID or API key to configure.

## Before you connect

You need a klaracase account. Usage is metered in monthly credits.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Decisions | Search court decisions in plain language and get the court, date, and file number (Aktenzeichen) |
| Full texts | Read the full text of decisions, statutes, and EU legal acts |
| Citations | See which decisions a ruling cites and which later decisions cite it |
| Citation check | Check the citations in your own text against real documents |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- klaracase is a research tool and does not give legal advice.
- Tool calls run under the klaracase account of the user who authorizes the connection.

## Docs

- klaracase: https://klaracase.de
- Server URL: https://klaracase.de/mcp

## License

MIT
