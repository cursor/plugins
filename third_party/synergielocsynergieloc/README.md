# Synergieloc

Cursor plugin that connects agents to [Synergieloc](https://synergieloc.fr) through Synergieloc's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Design buildings with CAD, IFC, and BIM checks, and manage French rentals with legal basis.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Synergieloc**.
3. Click **Install**, then complete the Synergieloc sign-in prompt.

Or run `/add-plugin synergielocsynergieloc` in chat.

## MCP

```json
{
  "mcpServers": {
    "synergielocsynergieloc": {
      "type": "http",
      "url": "https://synergieloc.fr/mcp/compte"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE and dynamic client registration, so Cursor prompts for Synergieloc sign-in when the plugin connects. There is no client ID to configure. On the sign-in page, choose **Create my free access** (no e-mail or payment) or paste a Synergieloc API key.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Building design | Describe a building and get a checked scene, DXF drawings, and an IFC 4 model |
| BIM checks | Run 180+ BIM rule checks (including fire safety) and clash detection |
| Planning | Get quantities, cost estimates, a French building-permit draft, a 4D site schedule, and a 4K walkthrough |
| Rental management | French IRL rent review, service-charge settlement, and rent receipts, each with its legal basis |

The server lists about 250 tools and serves the list live, so new tools appear without a plugin update. The hosted runtime is the source of truth for tool names and schemas. Try `cao_demo` with `{"exemple": "maison"}`, then `cao_verifier`, `cao_generer_dxf`, `cao_generer_ifc`, `cao_bim_incendie`, or `irl_revision_loyer`.

## Notes

- Tool calls run under the Synergieloc access of the user who authorizes the connection.
- Synergieloc says CAD generation is free until 31/12/2026.
- Tool names and many results are in French.

## Docs

- Synergieloc: https://synergieloc.fr
- Community: https://synergieloc.fr/portal/communaute
- Server URL: https://synergieloc.fr/mcp/compte
- Support: contact@synergieloc.fr

The logo points at Synergieloc's hosted icon (`https://synergieloc.fr/static/favicon-512.png`). synergieloc.fr was unreachable when this plugin was added, so no image file is committed.

## License

MIT
