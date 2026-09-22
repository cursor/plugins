# Clarify

Cursor plugin that connects agents to [Clarify](https://clarify.ai), the AI-native CRM, through Clarify's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search, create, and update CRM records (people, companies, deals, and custom objects), work with lists, campaigns, and email, manage calendar events and meeting transcripts, and run agents and workflows in the signed-in Clarify workspace.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Clarify**.
3. Click **Install**, then complete the Clarify sign-in prompt.

Or run `/add-plugin clarify` in chat.

## MCP

```json
{
  "mcpServers": {
    "clarify": {
      "type": "http",
      "url": "https://api.clarify.ai/mcp"
    }
  }
}
```

Auth is OAuth against Clarify. Cursor prompts for Clarify user login when the plugin connects — there is no API key or client ID to configure.

## Before you connect

You need a Clarify account with access to a workspace. Tools run as the signed-in user and cannot exceed that user's permissions.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Records & objects | Search, create, update, merge, and delete records; read and edit schema, fields, and custom objects |
| Lists | Inspect, create, update, and delete lists |
| Lead Finder | Find leads and import them as records |
| Campaigns & email | Create and manage campaigns, view recipients, draft and send email |
| Calendar & meetings | Read and manage calendar events, respond to invites, pull transcripts, and create meeting snippets |
| Agents & workflows | Create, run, and inspect agents and workflows |
| Artifacts | Create and manage artifacts such as reports and dashboards |
| Analytics | Query records and run analytics |
| Attachments | Upload file attachments to records |
| Records collaboration | Add comments and manage record access |

The hosted runtime is the source of truth for tool names and schemas. A workspace sees a filtered view of the catalog based on its enabled features.

## Notes

- Tool calls run as the Clarify user who authorizes the connection and cannot exceed that user's permissions.
- Read operations are auto-approved. Write operations request confirmation before they change workspace data.
- Clarify hosts the server itself; this plugin does not wrap a local stdio server.
- Revoke access at any time from your Clarify account settings.

## Docs

- Connect an AI agent to Clarify: https://developer.clarify.ai/docs/getting-started/ai-agents
- Authentication: https://developer.clarify.ai/docs/getting-started/authentication
- Server URL: https://api.clarify.ai/mcp

## License

MIT
