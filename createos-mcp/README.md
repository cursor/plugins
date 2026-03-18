# CreateOS MCP plugin

Deploy and manage full-stack applications directly from Cursor using the CreateOS platform by NodeOps.

## Installation

```bash
/add-plugin createos-mcp
```

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `deploy` | Deploy applications from GitHub repos, Docker images, or file uploads |
| `manage-environments` | Create and configure staging, production, and custom environments |
| `security-scan` | Run and review security scans on deployed applications |

### Agents

| Agent | Description |
|:------|:------------|
| `deployment-monitor` | Monitor deployments and report build status, errors, and runtime health |

### Rules

| Rule | Description |
|:-----|:------------|
| `createos-best-practices` | Best practices for deploying and managing applications with CreateOS |

### MCP Server

Connects to the CreateOS MCP endpoint at `https://api-createos.nodeops.network/mcp` providing 85+ tools across 14 domains: projects, deployments, environments, domains, apps, templates, API keys, security, analytics, logs, GitHub integration, file uploads, account management, and project transfers.

## Supported runtimes

Node.js 18/20/22, Python 3.11/3.12, Go 1.22/1.25, Rust 1.75, Bun 1.1/1.3, and static sites.

## Supported frameworks

Next.js, React (SPA/SSR), Vue.js (SPA/SSR), Nuxt, Astro, Remix, Express, FastAPI, Flask, Django, Gin, Fiber, and Actix.

## Links

- [CreateOS Dashboard](https://createos.nodeops.network)
- [GitHub Repository](https://github.com/NodeOps-app/createos-mcp)
- [NodeOps](https://nodeops.network)

## License

MIT
