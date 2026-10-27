---
name: live-docs
description: Find current Sugra documentation. Use when an endpoint, parameter, default, or version might be stale. Canonical docs are https://docs.sugra.ai (search and Ask AI). Also OpenAPI, /sources, the blog, and MCP tools/list.
license: MIT
---

# Live docs

https://docs.sugra.ai is the external documentation truth. It has search and Ask AI. Per-endpoint parameters, schemas, and examples live in its API Reference sidebar. This skill pack does not copy that catalog.

## How to read docs.sugra.ai

1. Open https://docs.sugra.ai (Welcome: directions, key, envelope, plans, MCP).
2. Search the docs site, or use Ask AI, for the operation or topic.
3. Open the endpoint page in API Reference before calling. Confirm method, path, parameters with their defaults, and body.
4. Pages have a Markdown version at the page URL plus `.md`, and https://docs.sugra.ai/llms.txt indexes them. Prefer those for a compact read.

Do not invent a path. Do not treat this SKILL.md, a README, or a cookbook recipe as the operation list.

## Machine companions (not a second docs site)

| URL | Role |
|---|---|
| `GET https://sugra.ai/openapi.json` | HTTP contract for the call |
| `GET https://sugra.ai/sources` | live source names |
| `GET https://sugra.ai/health` | liveness |

These need no key. Public copy uses hedges (1,600+ endpoints, 160+ sources, 36 domains); quote them as hedges, not as counts. The MCP wheel catalog can lag OpenAPI. If MCP search misses, search docs.sugra.ai, then OpenAPI, then say whether the operation exists.

MCP once connected: `initialize` (`serverInfo.version`), `tools/list`, `prompts/list`, `resources/list`.

## Other public surfaces (search these, not the open web first)

| Where | What |
|---|---|
| https://sugra.ai | product |
| https://sugra.systems | company, legal, API marketing, direction pages |
| https://sugra.systems/blog | blog index; article also as `/{slug}.md`; `llms.txt` |
| https://app.sugra.ai | keys, usage, billing, playground |
| https://app.sugra.ai/register | sign up; a key is issued at signup |
| https://app.sugra.ai/developer/keys | manage keys |
| https://sugra.systems/api/pricing | plans and prices |
| https://docs.sugra.ai/doc-2444801 | ecosystem: MCP package, HTTP recipes, OpenBB provider |

Legal: https://sugra.systems/terms-of-service and sibling policy pages. Contacts: `support@`, `legal@`, `privacy@`, `abuse@` sugra.systems.

Source names: live `/sources`. Sovereign, intergovernmental, and academic names are open. Commercial upstreams appear as Sugra Finance, Sugra News, Sugra Crypto, Sugra Forex, Sugra Weather.
