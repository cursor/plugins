---
name: envelope-and-attribution
description: Parse Sugra API payloads over HTTPS or MCP, keep source attribution, and tell observation time from request time. Use when reading a response, citing a figure, or shaping a large payload.
license: MIT
---

# Envelope and attribution

The API is LLM-friendly: one JSON envelope `{data, meta}` on most payloads, and the envelope-less exceptions are named below. Envelope detail also lives on https://docs.sugra.ai.

Most responses:

```json
{
  "data": {},
  "meta": {
    "endpoint": "/api/v1/...",
    "data_time": "2026-06-12T19:30:00Z",
    "response_time": "2026-06-12T19:30:01Z",
    "provider": "Sugra API ...",
    "source": "fred",
    "attribution": "<upstream notice, quote it verbatim>",
    "cached": false
  }
}
```

Always present: `endpoint` (the operation that answered), `data_time`, `response_time`, `provider`. Present when they apply:

| Key | Meaning |
|---|---|
| `source` | the upstream source id; name it only when it is a sovereign, intergovernmental, or academic source (Attribution below) |
| `attribution` | a notice the source requires; repeat it word for word wherever the figure is shown |
| `period` | the unit of observation (for example `2026-Q1`) when `data_time` is the start of a period |
| `data_age_days` | days since a time the source itself stated; absent when the source gave only a date or period, or no readable time (Time below) |
| `cached` | served from the platform cache |
| `stale`, `stale_since` | the data is older than it should be; say so when quoting it |
| `fallback_used`, `fallback_chain` | a secondary source answered |
| `notes` | a data quality caveat; pass it on |

Some payloads also carry a `license` inside `data`. Keep it with the figure.

Some payloads are envelope-less (a flat object with `meta` or `_meta` on the same record). Provenance keys still apply.

HTTP: this JSON body plus `X-RateLimit-*` headers.

MCP: `call_endpoint` / `fetch_data` return the same payload (a top-level array is wrapped as `{data: ...}`). `limit` and `fields` shape the records list in `data`, and lists nested inside records are never truncated; `include_raw` attaches the complete original payload under `raw` when it fits the size cap. An object `data` without a records list, or an envelope-less object, counts as one record for `fields`, and `meta` / `_meta` stay. On the hosted server a projection that matches nothing removes nothing, and the records list can also be the one list inside an object `data`, when exactly one of `data`, `entries`, `events`, `history`, `items`, `observations`, `points`, `records`, `results`, `rows`, `series`, `timeseries` holds a list. Keys beside that list, such as `total` and `count`, stay unless a `fields` entry names a key of `data` itself, which projects `data` as one record instead. Stdio packages up to 0.12.0 do not look inside an object `data` for a records list and can return empty records when no field matches. `meta.shaped` reports `fields_applied`, `fields_unmatched`, `limit_applied` and, on the hosted server, `records_path`.

`meta.shaped` reports what shaping actually did, not an echo of the request. On the hosted server `records_path` names the records list that `limit` bounded or that `fields` were matched against (for example `data.items`), even when no field matched, and is null when shaping used no records list. There `limit` keeps the newest end when every record carries one date or period key in one format and the list runs one way by it (the last N of an oldest-first list, the first N of a newest-first one), and otherwise the first N; `meta.shaped` then reports `order` (`asc`, `desc` or `unknown`) and `kept_end` (`newest` or `first`). When `records_path` is `data.*.observations` (several named sub-series side by side, each bounded on its own), `order` and `kept_end` are maps keyed by sub-series name. Before citing the latest figure from a bounded list, check that `kept_end` is `newest`, for a sub-series the value under its name. Stdio packages up to 0.12.0 keep the first N and report neither.

## Time

`data_time` in `meta` (or `_meta` on a flat payload) is the observation or publication time the source states for the data. When the source states no time, or one that cannot be read, `data_time` falls back to the HTTP response time (in `meta` it then equals `response_time`) and `data_age_days` is absent; for a time that cannot be read, `meta.notes` says so. That fallback is the time of the response, not of the data: never present it as the date of a figure, and if it is shown at all, label it the response time. When `meta.period` is present, `data_time` is the start of that period, not a moment of observation. An `as_of` in a record, in `data`, or in `meta` dates the figure itself: a period, a report or snapshot date, or a collection time. When an `as_of` differs from a `data_time` the source stated, quote both. When nothing dates the figure, say the source time is unavailable. Do not describe a delayed series as a live tick, and say so when `stale` is true.

## Attribution

Every figure needs a source and an as-of. Take the source from `meta` / `_meta`, and the date from an `as_of` wherever it sits, `meta.period`, or a `data_time` the source stated (Time above): name the source, give the date or period or say the source time is unavailable, and when `attribution` is present repeat it verbatim. Live list: https://sugra.ai/sources (MCP resource `sugra://attribution`).

- Sovereign, intergovernmental, and academic sources are named openly (for example FRED, IMF, ECB, NOAA, World Bank, SEC EDGAR).
- Commercial upstreams appear under Sugra-branded wrappers (Sugra Finance, Sugra News, Sugra Crypto, Sugra Forex, Sugra Weather). Cite the wrapper, not the vendor, even when `meta.source` carries the vendor's id; a required `attribution` notice is still repeated as given.

This is data presentation, not investment, legal, or compliance advice. Screening tools return a signal, not a determination.
