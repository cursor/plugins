# CantoNotes

Cursor plugin that connects agents to [CantoNotes](https://cantonotes.com) through CantoNotes' hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

CantoNotes turns meetings into notes, transcripts, and a private Intelligence snapshot. This plugin lets agents read the signed-in user's meetings: list and search them, open notes and transcript text, and read that user's Intelligence and to-dos.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **CantoNotes**.
3. Click **Install**, then complete the CantoNotes sign-in prompt.
4. On the consent page, pick the workspaces to share and choose **Allow**.

Or run `/add-plugin cantonotes` in chat.

## MCP

```json
{
  "mcpServers": {
    "cantonotes": {
      "type": "http",
      "url": "https://app.cantonotes.com/api/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with the `meetings:read` scope. Cursor prompts for CantoNotes sign-in when the plugin connects; there is no API key to configure.

## Before you connect

You need a CantoNotes account with at least one workspace.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Workspaces | List the workspaces shared with the connection |
| Meetings | List recent meetings and search them |
| Notes and transcripts | Open meeting notes and transcript text |
| Intelligence and to-dos | Read the user's Intelligence snapshot and to-dos |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Access is read-only. Reads do not change meetings, notes, or to-dos.
- Only the workspaces picked at connect time are shared. A workspace joined later stays out until you edit the connection in **CantoNotes → Settings → Connected agents**.
- Notes and transcripts are text only; no audio or video.

## Docs

- CantoNotes: https://cantonotes.com
- Server URL: https://app.cantonotes.com/api/mcp

## License

MIT
