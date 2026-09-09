# Google Cloud SQL

Cursor plugin that connects agents to [Google Cloud SQL](https://docs.cloud.google.com/sql/docs/mysql/use-cloudsql-mcp) through Google Cloud SQL's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Manage Cloud SQL instances, users, and backups, and run SQL.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Google Cloud SQL**.
3. Click **Install**, then complete the Google Cloud SQL sign-in prompt.

Or run `/add-plugin google-cloud-sql` in chat.

## MCP

```json
{
  "mcpServers": {
    "google-cloud-sql": {
      "type": "http",
      "url": "https://sqladmin.googleapis.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Google Cloud SQL sign-in when the plugin connects — there is no client ID or personal access token to configure.

## Before you connect

You need a Google Cloud project with the Cloud SQL Admin API enabled, and your Google account needs `roles/mcp.toolUser` plus a Cloud SQL viewer, editor, or admin role.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Instances | List, get, create, update, and clone instances; poll long-running operations |
| Users | List, create, and update database users |
| Backups | Create and restore backups; import from Cloud Storage |
| SQL | Run SQL on MySQL and PostgreSQL instances that allow the Data API |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Google also publishes read-only (`/mcp/readonly`) and instance-management (`/mcp/instance_manage`) endpoints; this plugin uses the full endpoint.
- SQL execution is not available on SQL Server instances.
- Grok also offers this connector with service-identity auth; this plugin configures only the user OAuth flow.

## Docs

- Use the Cloud SQL MCP server: https://docs.cloud.google.com/sql/docs/mysql/use-cloudsql-mcp
- Server URL: https://sqladmin.googleapis.com/mcp

Logo is Google Cloud SQL's official mark.

## License

MIT
