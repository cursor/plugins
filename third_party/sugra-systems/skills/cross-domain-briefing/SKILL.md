---
name: cross-domain-briefing
description: Compose one briefing from two or three Sugra directions over HTTPS or MCP. Use when a question spans Finance, Macro, Entity, Net Atlas, News, Earth, or Research and one operation is not enough.
license: MIT
---

# Cross-domain briefing

Split the question. Call two or three operations. Do not invent a combined index. HTTP and MCP are both valid; use the surface already connected. Confirm each operation on https://docs.sugra.ai.

## Pattern

1. Split the question into 2-3 concrete asks (place, series, snapshot). Name the directions involved (Finance, Macro, Entity, Net Atlas, News, Earth, Research).
2. For each ask, discover then call (`discover-and-call`). Prefer sovereign or intergovernmental sources when the catalog offers them.
3. Keep units, geography, and clocks separate. Do not blend a port throughput z-score with a weather reading into one invented number.
4. Quote each figure with its source from `meta` (or `_meta` on a flat payload) and its date: an `as_of` when present (in a record, in `data`, or in `meta`), `meta.period`, or a `data_time` the source stated, never one that fell back to the response time. With none of them, say the source time is unavailable (see `envelope-and-attribution`).
5. Close with what the catalog did not cover, not a prediction.

## Example shape (not a canned path list)

"What is happening around a chokepoint this week?" can be three calls: port throughput (Sugra Earth / transport), conditions at a coordinate on the route (Sugra Earth), and one related sovereign or intergovernmental series docs.sugra.ai actually lists. Discover, call, present side by side.

The MCP prompt `earth_conditions` is a one-coordinate recipe for weather, air quality, and nearby hazards. This skill is the longer form when those conditions are only one pane.

Do not add per-endpoint MCP tools. Do not treat screening as a briefing source unless the question is about a named party. On MCP, stay on the gateway tools so the briefing works on stdio and hosted alike. Do not frame the output as investment, legal, or routing advice.
