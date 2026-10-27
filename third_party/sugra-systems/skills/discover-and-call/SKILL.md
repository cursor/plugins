---
name: discover-and-call
description: Find the right Sugra operation, call it over HTTPS or MCP, and check that the result answers the question. Use when the path or operation_id is unknown, before guessing parameters, before quoting a figure, or after a catalog miss. Confirm details on https://docs.sugra.ai. Do not invent routes.
license: MIT
---

# Discover and call

Do not invent paths or `operation_id`s. Confirm the operation on https://docs.sugra.ai (search or Ask AI, then the endpoint page). Two complete loops, same API.

## HTTP loop

1. If the path is already known, skip to step 4 after confirming it on docs.sugra.ai.
2. Search https://docs.sugra.ai. Machine companion: `GET https://sugra.ai/openapi.json`. List of source names: `GET https://sugra.ai/sources`.
3. Read every parameter with its default and, for POST, the request body. Parameter names come from docs or the spec, spelled exactly: over HTTP most routes ignore an unknown query parameter without an error, so a misspelled filter (`country` for `countries`) returns the default data.
4. Call `https://sugra.ai` with `x-api-key`. Set every parameter the question names (place, identifier, period, frequency, unit). GET uses query params. POST uses JSON body plus any path or query params the spec lists.
5. Parse `{data, meta}`, or the flat object with `meta` / `_meta` that a few payloads return. Check the answer (below), then cite the source and the figure's date (check 4). Read `X-RateLimit-Remaining`.

```
GET https://sugra.ai/api/v1/etf/sectors/relative-strength?window=1m
x-api-key: sugra_...
```

## MCP loop

Works on hosted and stdio. Do not call hosted-only names on stdio. The catalog tools (`search_endpoints`, `describe_endpoint`, `list_toolsets`, `list_sources`) read the catalog bundled with the server and do not call https://sugra.ai; only `call_endpoint`, `fetch_data`, and the entity tools do.

1. `search_endpoints(query=..., toolset=None, source=None, limit=10)`. Unknown `toolset` / `source` returns `unknown_toolset` / `unknown_source` with the valid set, not an empty hit list.
2. Pick an `operation_id` from `results` by its summary, not by its rank: the first hit is not always the measure asked for (a search for an unemployment rate can rank a labour force participation series first). Confirm it on docs.sugra.ai.
3. `describe_endpoint(operation_id=...)` - params with defaults, `request_body_schema` on POST, `agent_hints` (`duration_class`, `max_concurrency`, `bulk_cost`).
4. `call_endpoint(operation_id=..., params={...}, body=...)`. Set every parameter the question names. On the hosted server a key the operation does not declare returns `unknown_parameters` with `accepted` and, when close, `did_you_mean`.

`fetch_data(query=...)` is a one-shot: it calls the top catalog match with the params given. A missing required parameter returns `needs_params` with the selected endpoint and candidates; a missing optional one silently takes its default. Check the answer below before using it; if the operation or the place is wrong, use the four-step loop. `list_toolsets` and `list_sources` (resources `sugra://catalog/domains`, `sugra://catalog/sources`) are the map, not the query.

Shaping on `call_endpoint` / `fetch_data` (`limit`, `fields` as dotted paths, `include_raw`): skill `envelope-and-attribution`.

Hosted only: `resolve_entity`, `get_snapshot`, `get_timeseries`. LEI/VAT and sanctions on every transport: `sugra_entity_lookup`, `sugra_entity_screen`.

The MCP prompts (`market_snapshot`, `macro_briefing`, `sanctions_screening`, `sector_compare`, `earth_conditions`, `source_overview`) are numbered recipes over the gateway tools. They are not the catalog and do not cover every direction. For anything they do not name, use the loop above.

## Check the answer before quoting it

1. `meta.endpoint` is the operation you meant.
2. The place, entity, and period in `data` are the ones asked about, not a default.
3. The measure is the one asked about: a participation rate is not an unemployment rate, a level is not a change, a monthly figure is not an annual one.
4. The figure is dated by an `as_of` (in a record, in `data`, or in `meta`), by `meta.period`, or by a `data_time` the source stated, never by one that fell back to the response time. With none of them, say the source time is unavailable (skill `envelope-and-attribution`).

If any check fails, fix the call. Do not present a near miss as the answer, and do not fill a gap from memory.

## Misses and errors

A miss is not "Sugra has no data". Search docs.sugra.ai. Widen the query. Drop a bad MCP `toolset`/`source` filter. If MCP search still misses, fetch live `/openapi.json` (the wheel catalog can lag), then HTTP-call if the spec has it.

An error message usually names the fix: read it before retrying. A 400 or 422 over HTTPS names the parameter or value to change; over MCP a 422 can arrive as a bare `HTTP 422`. Full table: skill `auth-and-quota`.

Do not add per-endpoint MCP tools to skip this loop. Do not skip `describe_endpoint` when the parameter list is unknown.

## Timeouts

30 seconds covers most GETs. Bulk or live-upstream POSTs can run longer. MCP `agent_hints.duration_class` is the budget hint. A timeout is not empty data.
