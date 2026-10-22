# Databricks Genie One

Cursor plugin that connects agents to [Databricks Genie](https://www.databricks.com/product/business-intelligence/genie) through the Genie One [Model Context Protocol](https://modelcontextprotocol.io/) server on your Databricks workspace.

Agents ask Genie questions about your workspace's data in plain language, and Genie answers from the data the signed-in user can read.

## Install

1. A Databricks account admin creates an OAuth app connection (see [Team setup](#team-setup)).
2. A Cursor team admin opens **Cursor Settings → Plugins**, searches for **Databricks Genie One**, installs it for the team, and enters the workspace hostname and client.
3. Each member signs in to Databricks when Cursor prompts them.

Or run `/add-plugin databricks-genie-one` in chat.

## MCP

The plugin points at your workspace's Genie One endpoint:

```json
{
  "mcpServers": {
    "databricks-genie-one": {
      "type": "http",
      "url": "https://${DATABRICKS_HOST}/ai-gateway/mcp-services/system.ai.genie_one_mcp",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "CLIENT_SECRET": "${CLIENT_SECRET:-}",
        "scopes": ["ai-gateway", "offline_access"]
      }
    }
  }
}
```

## Team setup

Databricks does not support dynamic client registration, so each team brings its own OAuth app connection.

### 1. Create an OAuth app connection in Databricks

A Databricks account admin opens the account console, goes to **Settings → App connections**, and adds a connection with these redirect URIs:

- `https://www.cursor.com/agents/mcp/oauth/callback`
- `http://127.0.0.1:8787/callback`

Generating a client secret is optional. Without one, the connection is a public client.

### 2. Enter the connection in Cursor

A Cursor team admin fills in:

| Field | Value |
| --- | --- |
| `DATABRICKS_HOST` | Bare workspace hostname, for example `dbc-a1b2c3d4-e5f6.cloud.databricks.com`. Leave out `https://`, any path, and any port. |
| `CLIENT_ID` | Client ID of the app connection. |
| `CLIENT_SECRET` | Optional. Client secret of the app connection, if it has one. Stored encrypted and never shown back. |

### 3. Members sign in

Each member signs in to Databricks with their own account. Genie answers only from data that account can read.

## Docs

- Databricks Genie: https://docs.databricks.com/aws/en/genie/
- Databricks OAuth app connections: https://docs.databricks.com/aws/en/integrations/enable-disable-oauth
- Model Context Protocol: https://modelcontextprotocol.io

Logo is Databricks' official Genie icon, from databricks.com.

## License

MIT
