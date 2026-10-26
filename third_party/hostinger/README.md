# Hostinger

Cursor plugin that connects agents to [Hostinger](https://hostinger.com) through Hostinger's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server, built on the official Hostinger API.

Deploy and manage Hostinger websites, WordPress, domains, DNS, VPS, and billing. Ask in plain language ("deploy this app to example.com", "add an A record") and the agent carries it out.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Hostinger**.
3. Click **Install**, then complete the Hostinger sign-in prompt.

Or run `/add-plugin hostinger` in chat.

## MCP

```json
{
  "mcpServers": {
    "hostinger": {
      "type": "http",
      "url": "https://mcp.hostinger.com"
    }
  }
}
```

Auth is OAuth. On the first request Cursor opens a browser window to sign in with your Hostinger account. There is no API key to configure.

## Before you connect

You need a Hostinger account. Most tools need an active hosting plan, domain, or VPS on that account.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Hosting | Create websites and deploy static, PHP, Node.js, and WordPress sites |
| WordPress | Install, configure, and maintain WordPress sites, plugins, and themes |
| Domains and DNS | Check availability, manage domains, and edit DNS records |
| VPS | Manage virtual machines, firewalls, snapshots, and backups |
| Billing | View subscriptions, orders, and payment methods |

The hosted runtime is the source of truth for tool names and schemas.

## Skills

Skills from [hostinger/api-mcp-server](https://github.com/hostinger/api-mcp-server/tree/main/skills):

- `deploy-to-hosting`: deploy a project to Hostinger web hosting
- `connect-domain`: connect a custom domain, DNS, and SSL to a site
- `migrate-to-hosting`: move a site from another host without downtime
- `maintain-wordpress`: keep WordPress sites updated and healthy
- `troubleshoot-website`: diagnose a broken or slow site
- `audit-hosting`: review an account's sites, domains, and plans
- `headless`: build a headless WordPress, ecommerce, or web app site end to end

## Notes

- Tool calls run under the Hostinger account that authorizes the connection.
- Destructive actions (deleting websites, overwriting deployments) should be confirmed before they run.

## Docs

- Hostinger: https://hostinger.com
- Source: https://github.com/hostinger/api-mcp-server
- Server URL: https://mcp.hostinger.com

Logo is Hostinger's mark from [hostinger/hostinger-cursor-plugin](https://github.com/hostinger/hostinger-cursor-plugin/blob/main/assets/logo.svg).

## License

MIT
