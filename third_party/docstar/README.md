# DocStar

Cursor plugin that connects agents to [DocStar](https://docstar.io/) through DocStar's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

DocStar turns your product's API into published docs that your users' AI assistants can read and call. Your agent can document each endpoint from your code, publish the docs, and give you one link to share. Your users' assistants then look up any endpoint and call your API with the exact URLs, fields, and auth from your docs.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **DocStar**.
3. Click **Install**, then complete the DocStar sign-in prompt.

Or run `/add-plugin docstar` in chat.

## MCP

```json
{
  "mcpServers": {
    "docstar": {
      "type": "http",
      "url": "https://mcp.docstar.io/mcp"
    }
  }
}
```

Auth is OAuth. Reading published docs needs no account; creating or changing docs requires DocStar sign-in, which Cursor prompts for when the plugin connects.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Organization | Look up your DocStar organization and its details |
| Documents | Create and edit documents in your workspace |
| API docs | Document endpoints from your code and publish them |
| Lookup | Find published endpoints and call them with the documented URLs, fields, and auth |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- DocStar: https://docstar.io/
- Server URL: https://mcp.docstar.io/mcp

Logo is the DocStar favicon from Walkover's `docStarWebsite` GitHub repository, converted to a 256×256 PNG. docstar.io and the submitted logo URL could not be reached when this plugin was added.

## License

MIT
