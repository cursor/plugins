# Google Cloud BigQuery

Cursor plugin that connects agents to [Google Cloud BigQuery](https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp) through Google Cloud BigQuery's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Explore datasets and tables and run SQL queries.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Google Cloud BigQuery**.
3. Click **Install**, then complete the Google Cloud BigQuery sign-in prompt.

Or run `/add-plugin google-cloud-bigquery` in chat.

## MCP

```json
{
  "mcpServers": {
    "google-cloud-bigquery": {
      "type": "http",
      "url": "https://bigquery.googleapis.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Google Cloud BigQuery sign-in when the plugin connects — there is no client ID or personal access token to configure.

## Before you connect

You need a Google Cloud project with the BigQuery API enabled, and your Google account needs the MCP Tool User role (`roles/mcp.toolUser`) plus BigQuery Job User and Data Viewer on that project.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Explore | List datasets and tables and read their metadata and schemas |
| Query | Run read-only SQL, including BigQuery ML functions |
| Write | Run DML and DDL when the account allows it |
| Jobs | Poll results and cancel running query jobs |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Queries are billed to the project id passed to the tool.
- Admins can block the write-capable `execute_sql` tool with an IAM deny policy while leaving read-only queries available.
- Grok also offers this connector with service-identity auth; this plugin configures only the user OAuth flow.

## Docs

- Use the BigQuery MCP server: https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
- Tools reference: https://docs.cloud.google.com/bigquery/docs/reference/mcp
- Server URL: https://bigquery.googleapis.com/mcp

Logo is the official BigQuery product icon from Google Cloud's architecture icon set, on a padded white tile.

## License

MIT
