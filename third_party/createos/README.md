# CreateOS

Cursor plugin that connects agents to [CreateOS](https://createos.nodeops.network) through CreateOS's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Create projects from a repository, Docker image, or file upload, deploy them, and manage environments, custom domains, logs, and analytics on CreateOS, NodeOps' build-and-deploy platform.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **CreateOS**.
3. Click **Install**, then complete the CreateOS sign-in prompt.

Or run `/add-plugin createos` in chat.

## MCP

```json
{
  "mcpServers": {
    "createos": {
      "type": "http",
      "url": "https://api-createos.nodeops.network/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE through NodeOps ID (`https://id.nodeops.network`). The server supports dynamic client registration at `https://api-createos.nodeops.network/register`, so there is no client ID or key to configure. The client prompts for NodeOps sign-in when the plugin connects.

## Before you connect

You need a CreateOS account, or you create one at sign-in.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Projects | Create and configure projects from VCS repositories, Docker images, or direct uploads |
| Deployments | Deploy, monitor builds, cancel deployments, and assign deployments to environments |
| Environments | Development, staging, and production environments with their own variables and resources |
| Domains | Custom domains and SSL certificates |
| Monitoring | Logs, analytics, and performance metrics |
| Security | Security scans and API keys |
| GitHub | Connect repositories, watch branches, and trigger deployments |
| Apps | Group related projects and services |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- CreateOS MCP operations: https://createos.sh/docs/API-MCP/MCP-Operations
- CreateOS MCP on GitHub: https://github.com/NodeOps-app/createos-mcp
- Server URL: https://api-createos.nodeops.network/mcp

Logo is CreateOS's official app icon from createos.sh.

## License

MIT
