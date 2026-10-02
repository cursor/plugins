# Plaud

Cursor plugin that connects agents to [Plaud](https://www.plaud.ai) through Plaud's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

List and search the meetings and voice notes captured by your Plaud device or app, read full transcripts with timestamps and speaker labels, and pull the AI-generated summary, action items, and key topics for any recording into your work.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Plaud**.
3. Click **Install**, then complete the Plaud sign-in prompt.

Or run `/add-plugin plaud` in chat.

## MCP

```json
{
  "mcpServers": {
    "plaud": {
      "type": "http",
      "url": "https://mcp.plaud.ai/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Plaud sign-in when the plugin connects — there is no client ID or API key to configure. Each user signs in with their own Plaud account.

## Before you connect

You need a Plaud account with recordings synced to the Plaud cloud (from a Plaud device or the Plaud app). Recordings that have not been transcribed or summarized in Plaud yet will not have a transcript or note to return.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Recordings | `list_files` lists your recordings with optional filters (`query` keyword match on the recording name, `date_from` / `date_to`, pagination); `get_file` returns full details for one recording, including a temporary audio download URL, the transcript segments, and the AI notes |
| Transcripts | `get_transcript` returns the full transcript for a recording with timestamps and speaker labels |
| Summaries | `get_note` returns the AI-generated summary, action items, and key topics for a recording |
| Account | `get_current_user` shows which Plaud account is connected |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Recordings usually contain other people's speech. Transcripts and summaries the agent reads may include what colleagues, clients, or others said, so treat them as confidential and check local recording-consent rules before sharing output.
- Requests pass through Plaud's hosted MCP server (in the US). Plaud states it processes recording data in transit only and does not store it after the request completes; see [Plaud's privacy policy](https://plaud.ai/privacy).
- `get_file` returns a presigned audio URL that is valid for 24 hours.

## Docs

- Plaud MCP guide: https://docs.plaud.ai/plaud-mcp-cli/mcp
- Plaud MCP & CLI changelog: https://docs.plaud.ai/plaud-mcp-cli/changelog
- Developer platform overview: https://docs.plaud.ai/overview
- Server URL: https://mcp.plaud.ai/mcp

Logo is Plaud's official mark.

## License

MIT
