# Fairquery

Cursor plugin that connects agents to [Fairquery](https://getfairquery.com/)'s hosted Agent Trust [Model Context Protocol](https://modelcontextprotocol.io/) server.

Redact PII and secrets, check email syntax, look up OSV vulnerabilities, list sanctions sources, and read public job boards.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Fairquery**.
3. Click **Install**.

Or run `/add-plugin fairquery` in chat.

## MCP

```json
{
  "mcpServers": {
    "fairquery": {
      "type": "http",
      "url": "https://mcp.getfairquery.com/mcp"
    }
  }
}
```

The free tools need no authentication.

## What agents can do

| Category | Capabilities |
| --- | --- |
| PII | Scan and redact PII and secrets in text (`pii_*`) |
| Email | Check email syntax and flag likely typos (`email_*`) |
| Vulnerabilities | Look up package vulnerabilities in OSV (`osv_*`) |
| Sanctions | List sanctions sources such as OFAC SDN (`sanctions_*`) |
| Jobs | Read public job boards (`jobs_*`) |
| MCP | Precheck MCP servers (`mcp_server_precheck`) |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Optional paid tools run on your own Apify token, and Apify bills you directly. Fairquery charges no marketplace fee.

## Docs

- Fairquery: https://getfairquery.com/
- Server URL: https://mcp.getfairquery.com/mcp

## License

MIT
