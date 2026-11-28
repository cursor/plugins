# Google Search Console

Cursor plugin that connects Grok Bot to [Google Search Console](https://search.google.com/search-console) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Query Google Search performance, inspect how Google indexes a page, and manage a property's sitemaps.

## Install

1. Open **Grok Bot Settings → Plugins**.
2. Search for **Google Search Console**.
3. Click **Install**, then complete the Google sign-in prompt.

## MCP

```json
{
  "mcpServers": {
    "google-search-console": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/google-search-console/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Google with the `https://www.googleapis.com/auth/webmasters` scope. Grok Bot prompts for Google sign-in when the plugin connects.

## Tools

- **Performance:** `query_search_analytics`
- **Indexing:** `inspect_url`
- **Properties:** `list_sites`, `get_site`, `add_site`, `delete_site`
- **Sitemaps:** `list_sitemaps`, `get_sitemap`, `submit_sitemap`, `delete_sitemap`

## Docs

- Search Console API: https://developers.google.com/webmaster-tools/v1/api_reference_index

Logo is the official Google Search Console product icon, placed on a white tile with padding so it reads well in the UI.
