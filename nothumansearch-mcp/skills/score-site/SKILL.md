---
name: score-site
description: Get a detailed agentic readiness report for any domain and submit new sites for scoring
tools:
  - nothumansearch.get_site_details
  - nothumansearch.submit_site
  - nothumansearch.register_monitor
---

# Score a Site's Agent Readiness

Get a detailed breakdown of how well a website supports AI agent integration.

## When to use

- User asks "is this site agent-ready?" or "can an AI use this API?"
- User wants to check if a service has an MCP server, OpenAPI spec, or llms.txt
- User wants to submit their own site for scoring
- User wants to monitor a domain's readiness score over time

## Steps

1. Call `get_site_details` with the domain to get the full report
2. If the domain is not indexed, call `submit_site` to queue it for crawling
3. Optionally call `register_monitor` to get email alerts on score changes

## Score breakdown

The agentic readiness score (0-100) is based on:
- MCP server presence and verification
- OpenAPI/Swagger specification
- llms.txt file
- Structured API endpoints
- Documentation quality
- API key accessibility

## Example

"Check how agent-ready stripe.com is"

```
get_site_details(domain="stripe.com")
```
