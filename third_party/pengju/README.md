# LitSynth

Cursor plugin that connects agents to LitSynth, by [Pengju, LLC](https://litsource.net), through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

AI literature review generation with traceable citations. Agents can read release info, validate screening protocols, and with an account token prepare papers and generate cited reviews under plan and credit rules.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **LitSynth**.
3. Click **Install**.

Or run `/add-plugin pengju` in chat.

## MCP

```json
{
  "mcpServers": {
    "pengju": {
      "type": "http",
      "url": "https://litsynth.ai/api/mcp"
    }
  }
}
```

Public read tools (such as `litsynth_get_release_info` and `litsynth_list_releases`) work without signing in.

## Generating reviews

To prepare papers and generate reviews, create a token in LitSynth under **Settings → Security** with the `generate` scope and authenticate with it. Then use `litsynth_list_review_runs`, prepare, and generate. Generation consumes LitSynth credits under your plan's rules. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Website: https://litsource.net
- Server URL: https://litsynth.ai/api/mcp

Logo is the LitSynth mark from the publisher's asset host (https://pengju-marketplace-assets.vercel.app/litsynth-marketplace.svg). The submitted logo URL (https://litsynth.ai/favicon.svg) could not be reached from the build environment.

## License

MIT
