# CommSync

Cursor plugin that connects agents to [CommSync](https://commsync.ai) through CommSync's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

CommSync is one inbox for business SMS and email. Agents can search and read conversations across the user's phone numbers and mailboxes, manage contacts and labels, triage threads, and send texts and emails from the lines the user allows.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **CommSync**.
3. Click **Install**, then complete the CommSync sign-in prompt.

Or run `/add-plugin commsync` in chat.

## MCP

```json
{
  "mcpServers": {
    "commsync": {
      "type": "http",
      "url": "https://server.commsync.ai/api/mcp"
    }
  }
}
```

Auth is OAuth 2.1 against CommSync (PKCE, dynamic client registration). Cursor prompts for CommSync login when the plugin connects. On the consent screen the user chooses which phone and email lines Cursor may read and send from. There is no API key or client ID to configure.

## Before you connect

You need a CommSync account in a workspace with at least one connected phone number or email account. Access follows the user's role in their workspace, so an agent sees only the lines that user can see.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Threads | List, read, and search SMS and email conversations; mark read, archive, snooze, and move between Inbox, Spam, Promotions, and Automated |
| Sending | Reply to or start SMS and email conversations, forward messages, and check send capacity |
| Contacts | Search, create, update, and merge contacts and their phone and email identities |
| Labels | Create labels and assign them to contacts |
| Search | Full-text search across messages, contacts, and threads with match snippets |
| AI | Read the Daily Brief and AI settings |
| Channels | List connected phone numbers and email accounts |
| Webhooks | Register and manage outbound webhook endpoints |

Every write tool is annotated. Sends are marked destructive and open-world so Cursor asks before it sends.

The hosted runtime is the source of truth for tool names and schemas.

## Links

- Docs: <https://commsync.ai/docs/mcp>
- Setup guide: <https://commsync.ai/docs/connect-ai-apps>
- Privacy: <https://commsync.ai/privacy>
- Support: <support@commsync.ai>
