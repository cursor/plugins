# Beket

Cursor plugin that connects agents to [Beket](https://beket.ai) through Beket's official hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Run AEO/GEO/SEO audits and read how AI answer engines — ChatGPT, Perplexity, Gemini, Google AI Overviews and AI Mode — mention, rank, and cite a brand, then turn the gaps into content briefs and site changes.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Beket**.
3. Click **Install**, then complete the Beket sign-in prompt.

Or run `/add-plugin beket` in chat.

## MCP

```json
{
  "mcpServers": {
    "beket": {
      "type": "http",
      "url": "https://mcp.beket.ai/cursor/mcp"
    }
  }
}
```

Auth is OAuth 2.1. Cursor prompts for Beket sign-in when the plugin connects — there is no API key or client ID to configure.

## Before you connect

Any Beket account can sign in. On the free plan the only tool that works is `run_sample_analysis`, a public-data profile of a domain (brand, category, competitors, audience) with no visibility scores. Every other tool needs a paid plan and returns `402` otherwise.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Audits | Start a brand audit for a domain or a market audit for a topic, pick prompts and AI engines, and poll status |
| Visibility | Share of voice, mentions, position, and sentiment across answer engines |
| Citations | Which pages answer engines cite, and where competitors are cited instead |
| Opportunities | Winnable prompts, a prioritized roadmap, and engagement opportunities |
| Content | Generate content briefs and drafts from roadmap items, and track site changes |
| History | List snapshots and compare them over time |

The hosted runtime is the source of truth for tool names and schemas. Call `list_audits` as a read-only smoke test after connecting.

## Notes

- Tool calls run as the Beket user who authorizes the connection and only see that user's organization.
- `list_*`, `get_*`, and `compare_*` tools are read-only. `run_audit`, `start_audit`, `rerun_audit`, `generate_*`, and `update_*` spend plan budget or change audit state.

## Docs

- Using the Beket MCP: https://beket.ai/guides/using-the-beket-ai-mcp/
- Server URL: https://mcp.beket.ai/cursor/mcp

Logo is Beket's official mark.

## License

MIT
