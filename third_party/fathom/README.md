# Fathom

Cursor plugin that connects agents to [Fathom](https://fathom.video) through Fathom's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Bring Fathom meeting recordings, transcripts, and AI summaries into the editor to draft follow-ups and extract decisions.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Fathom**.
3. Click **Install**, then complete the Fathom sign-in prompt.

Or run `/add-plugin fathom` in chat.

## MCP

```json
{
  "mcpServers": {
    "fathom": {
      "type": "http",
      "url": "https://api.fathom.ai/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Fathom sign-in when the plugin connects.

## Before you connect

API access is available on all Fathom plan tiers, including free. CRM-matched contact and deal data requires a Business plan. In team or organization contexts, an owner may need to enable the connector before members can use it.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Meetings | List and search meetings, and filter by meeting type |
| Recordings | Look up recordings and their metadata |
| Transcripts & summaries | Pull full transcripts and AI-generated summaries |
| Teams | Team and meeting-type configuration |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Fathom user who authorizes the connection.
- Fathom's help center describes per-tool toggles, so an admin can narrow what the connector exposes.
- Fathom the meeting notetaker brands as fathom.video but serves its API and MCP from `fathom.ai`. The GitHub org `Fathom-AI` and the analytics product `usefathom` are different companies.
- Community `fathom-mcp` packages on npm take a `FATHOM_API_KEY` and are unofficial. This plugin uses Fathom's own hosted server.

## Docs

- Fathom MCP docs: https://developers.fathom.ai/mcp-docs
- Server URL: https://api.fathom.ai/mcp

Logo is Fathom's official mark, from the `fathom-video` GitHub organization.

## License

MIT
