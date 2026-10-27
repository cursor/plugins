---
name: auth-and-quota
description: Use a Sugra key, stay inside the daily quota, and act on each error over HTTPS or MCP. Use when the user needs a key, before a bulk call, or when a call returns 400, 401, 404, 422, 429, 5xx, missing_api_key, missing_bearer_token, unknown_parameters, needs_params, or upstream_*.
license: MIT
---

# Auth and quota

One key. Volume gating only: every plan sees every endpoint. Plans and errors on https://docs.sugra.ai (search Authentication, Rate limits).

Sign up at https://app.sugra.ai/register: a Free key is issued at signup. Keys: https://app.sugra.ai/developer/keys. Plans and prices: https://sugra.systems/api/pricing. Prefix `sugra_...`. Do not log the key, and do not put it in a skill file, a commit, or a chat.

Free: 50 requests a day. Paid plans raise that volume; the volume and price of each plan are on the pricing page.

The daily quota belongs to the account, not to one key: every key of the account draws on the same count. It resets at 00:00 UTC.

A keyed data call costs at least 1 request. The public system endpoints (`/health`, `/sources`, `/openapi.json`) and the stdio catalog tools make no data call. Before a bulk call read MCP `describe_endpoint` `agent_hints.bulk_cost`. Over HTTPS, `X-RateLimit-Remaining` on each keyed response shows what is left. Over MCP, hosted composed tools report their own cost in `billing` (`rate_limit_cost`, `downstream_calls`, `remaining`), and one composed call can spend more than 1 request.

## HTTPS API

```
x-api-key: sugra_...
```

On `https://sugra.ai` the key goes only in the `x-api-key` header.

Keyed responses carry `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (the last second of the UTC quota day in ISO 8601, `YYYY-MM-DDT23:59:59Z`), and `X-Request-ID`. A 429 also carries `Retry-After` (seconds).

## MCP

How each MCP client signs in to the Sugra API MCP server: https://docs.sugra.ai/doc-2263382.

MCP tool JSON does not forward `X-RateLimit-*`. Read an MCP error's `error` first, then follow its `hint` or `retry_hint` when it has one. When the API answered, the error has a numeric `status_code`, plus `request_id` (the API's `X-Request-ID`) and `retry_after` (seconds) when the API sent them. A network failure (`upstream_timeout`, `upstream_connect_error`, `upstream_transport_error`) has no HTTP status and carries a `reason`. An answer too large for MCP comes back trimmed with `meta.truncated`, or as `response_too_large`: narrow the filters. Catalog and validation errors (`unknown_parameters`, `missing_required_parameters`, `needs_params`, `missing_required_parameter_groups`, `unknown_operation_id`) make no API call and carry their own fields (table below).

## Errors

Read the message before anything else: it usually names the fix.

| Signal | Meaning | What to do |
|---|---|---|
| HTTP 400 / 422 | a parameter is missing, malformed, or out of range | find which one in the message (over MCP a 422 can arrive as a bare `HTTP 422`: then check every parameter against `describe_endpoint`), fix it, then call again |
| MCP `unknown_parameters` (hosted server only) | a key the operation does not declare | use a name from `accepted` or `did_you_mean` |
| MCP `missing_required_parameters` / `needs_params` / `missing_required_parameter_groups` | required parameters are missing | fill them from the returned list, then call again |
| MCP `unknown_operation_id` | the id is not in the catalog | search again; do not guess an id |
| HTTP 404 | no such path, or no such item (an airport, a paper, a series) | if the message names a missing item, fix the input; otherwise check the path on docs.sugra.ai. Do not guess |
| HTTP 401 / MCP `missing_api_key` / `missing_bearer_token` | missing or invalid credential | stop. Do not retry the same call. Over MCP, point the user to the sign-in page in MCP above |
| HTTP 429 / MCP 429 | the account's quota is spent, or a short protective limit | wait for `Retry-After` / `retry_after`, or until `X-RateLimit-Reset`. On the hosted server a spent quota carries `reason: daily_limit_reached` (with `daily_limit` and `plan` when known): tell the user it resets at 00:00 UTC |
| MCP `server_busy` / `deadline_exceeded` | the MCP server is at its limit, or the call ran past its time budget | do what its `retry_hint` says |
| HTTP 5xx / MCP `upstream_*` | platform or upstream fault | if the message says the input does not exist (an unknown series or identifier), fix the input; otherwise retry once with backoff, then tell the user to write to support@sugra.systems with `X-Request-ID` / `request_id` when there is one, else with the whole error |

Do not retry a 4xx unchanged. Retry a 429 only after the wait it names.
