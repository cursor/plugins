# Brevo

Cursor plugin that connects agents to [Brevo](https://www.brevo.com) through Brevo's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Manage contacts and lists, build email, SMS, and WhatsApp campaigns, and work with the built-in CRM's deals, companies, and tasks in your Brevo account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Brevo**.
3. Click **Install**, then set your Brevo MCP token (below).

Or run `/add-plugin brevo` in chat.

## MCP

```json
{
  "mcpServers": {
    "brevo": {
      "type": "http",
      "url": "https://mcp.brevo.com/v1/brevo/mcp",
      "headers": {
        "Authorization": "Bearer ${BREVO_MCP_TOKEN}"
      }
    }
  }
}
```

Auth is a Brevo **MCP token** sent as a bearer token. Brevo's regular API keys do not work — the key has to be created with **Create MCP server API key** enabled.

## Before you connect

Create the token in Brevo under **Account → SMTP & API → API Keys**, turn on **Create MCP server API key**, then set it in **Dashboard → Plugins → Configure**.

The token grants full read and write access to the account. There is no read-only mode, so treat it like a password and rotate it from the same screen if it leaks.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Contacts | Contacts, lists, segments, attributes, folders, and import/export |
| Email campaigns | Create and manage campaigns, templates, and transactional templates, and read analytics |
| SMS & WhatsApp | SMS campaigns plus WhatsApp campaigns and message management |
| CRM | Deals, companies, tasks, pipelines, and notes |
| Account & delivery | Senders, domains, dedicated IPs, users, webhooks, and external feeds |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run with the permissions of the MCP token, not a per-user identity.
- `https://mcp.brevo.com/v1/brevo/mcp` exposes all 27 modules at once. Brevo also serves one endpoint per module — for example `https://mcp.brevo.com/v1/brevo_contacts/mcp` — which is a good way to cut the tool count if the full server is too broad.
- Brevo describes the MCP server as early access, so the tool catalog can change.
- Brevo runs a second, separate MCP server for documentation search at `https://developers.brevo.com/_mcp/server`. This plugin points at the product server.

## Docs

- Brevo MCP protocol: https://developers.brevo.com/docs/mcp-protocol
- Integration guide (Cursor setup): https://developers.brevo.com/docs/integration-guide
- Server URL: https://mcp.brevo.com/v1/brevo/mcp

Logo is Brevo's official mark, from the `getbrevo` GitHub organization.

## License

MIT
