# Embarko

Cursor plugin that connects agents to [Embarko](https://embarko.ai/) through Embarko's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Embarko deploys and hosts apps built with AI coding agents. Ask the agent to deploy, host, publish, or launch an app or website, and Embarko detects the runtime, builds and deploys the app, and returns the live URL. It is designed for AI-built websites, portfolios, prototypes, student projects, internal tools, and small dynamic apps, with no servers, Docker, or DevOps to configure.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Embarko**.
3. Click **Install**, then complete the Embarko sign-in prompt.

Or run `/add-plugin embarko` in chat.

## MCP

```json
{
  "mcpServers": {
    "embarko": {
      "type": "http",
      "url": "https://mcp.embarko.ai/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Embarko sign-in when the plugin connects.

## Before you connect

You need an Embarko account. You can create one for free at [embarko.ai](https://embarko.ai/).

## What agents can do

| Category | Capabilities |
| --- | --- |
| Deploy | Build and deploy an app or website and return its live `.embarko.app` URL |
| Status | Check whether a deployed app is live |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Deployments run under the Embarko account of the user who authorizes the connection.
- Embarko apps read their port from `PORT` and bind to `0.0.0.0`; see [embarko.ai/docs/deploy](https://embarko.ai/docs/deploy).

## Docs

- Embarko: https://embarko.ai/
- Server URL: https://mcp.embarko.ai/mcp

The logo points at the submitted URL, `https://embarko.ai/assets/embarko-icon.svg`. embarko.ai could not be reached when this plugin was added, so no local copy is committed.

## License

MIT
