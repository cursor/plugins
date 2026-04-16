# Not Human Search MCP

Search engine built for AI agents. Find websites and APIs ranked by agentic readiness score (0-100).

## What it does

- **Agent-ready search**: Query 8,600+ indexed sites by keyword, category, or minimum agentic score
- **Readiness scoring**: Every site scored 0-100 based on MCP server, OpenAPI spec, llms.txt, structured API, and documentation quality
- **Site details**: Get a full agentic readiness report for any domain
- **Submit sites**: Add new sites for crawling and scoring
- **Monitoring**: Subscribe to alerts when a domain's score drops

## 5 MCP Tools

| Tool | Description |
|------|-------------|
| `search_agents` | Search for agent-ready websites and APIs by keyword, category, or minimum score |
| `get_site_details` | Get detailed agentic readiness report for a specific domain |
| `submit_site` | Submit a new site for crawling and indexing |
| `get_stats` | Get index statistics: total sites, average score, top category |
| `register_monitor` | Subscribe to alerts when a domain's agentic readiness score drops |

## Installation

Install via the Cursor plugin marketplace:

```
/add-plugin nothumansearch-mcp
```

Or add the MCP server manually:

```bash
claude mcp add --transport http nothumansearch https://nothumansearch.ai/mcp
```

## No API key required

All tools are free to use with no authentication.

## Links

- Website: [nothumansearch.ai](https://nothumansearch.ai)
- GitHub: [github.com/unitedideas/nothumansearch](https://github.com/unitedideas/nothumansearch)
- MCP Registry: [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io)
