---
name: search-agents
description: Find agent-ready websites and APIs by keyword, category, or minimum agentic score
tools:
  - nothumansearch.search_agents
  - nothumansearch.get_site_details
  - nothumansearch.get_stats
---

# Search Agent-Ready Sites

Use Not Human Search to find websites and APIs that are ready for AI agent integration.

## When to use

- User needs to find APIs or tools for an AI agent to use
- User asks "which sites have MCP servers?" or "find APIs with OpenAPI specs"
- User wants to discover agent-friendly services in a specific category
- User needs to evaluate whether a site is agent-ready

## Steps

1. Call `search_agents` with a keyword query, category filter, or minimum score
2. Review results — each includes domain, score, and detected capabilities
3. Call `get_site_details` on promising domains for a full readiness breakdown

## Filters

- `q` — keyword search (e.g. "code review", "payments")
- `category` — ai-tools, developer, data, finance, ecommerce, jobs, security, health, education
- `min_score` — minimum agentic readiness score (0-100)
- `has_mcp` — only sites with MCP servers
- `has_openapi` — only sites with OpenAPI specs
- `has_llms_txt` — only sites publishing llms.txt

## Example

"Find AI tools with MCP servers scored above 80"

```
search_agents(q="ai tools", min_score=80, has_mcp=true)
```
