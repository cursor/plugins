# LitFigure

Cursor plugin that connects agents to [LitFigure](https://litfigure.com) by [Pengju, LLC](https://litsource.net) through LitFigure's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Biomedical scientific figure drafting for AI agents. Generate and revise mechanism or workflow figures from research text; export PNG/SVG/PPTX under account credits.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **LitFigure**.
3. Click **Install**, then complete the LitFigure sign-in prompt.

Or run `/add-plugin pengju` in chat.

## MCP

```json
{
  "mcpServers": {
    "pengju": {
      "type": "http",
      "url": "https://litfigure.com/mcp"
    }
  }
}
```

The server supports OAuth. It also accepts a LitFigure token sent as `Authorization: Bearer <token>`. OAuth scopes include `figures:read`, `figures:write`, `figures:export`, and `usage:read`.

## Before you connect

You need a LitFigure account. Sign up at https://litfigure.com/login.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Drafting | Generate mechanism or workflow figures from research text |
| Revision | Revise existing figures |
| Export | Export figures as PNG, SVG, or PPTX |
| Usage | Show your LitFigure credit balance |

Figure generation and export consume LitFigure account credits. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- LitFigure: https://litfigure.com
- Publisher: https://litsource.net
- Server URL: https://litfigure.com/mcp

Logo is the LitFigure mark from the publisher's asset host (https://pengju-marketplace-assets.vercel.app/litfigure-marketplace.svg). The submitted logo URL was https://litfigure.com/icon.svg.

## License

MIT
