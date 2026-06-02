# Evolver — Self-Evolving Agent Memory (Cursor Plugin)

Give the Cursor agent a **persistent, auditable evolution memory**. Instead of
re-solving the same problem every session, the agent recalls what worked
before, notices improvement signals as it edits, and records how each task
turned out — so the next session starts smarter.

Powered by the [Genome Evolution Protocol (GEP)](https://evomap.ai) and the
[`@evomap/evolver`](https://github.com/EvoMap/evolver) engine.

> **Status:** v0.1.0 — hooks + skill + rule. Works standalone (local memory).
> The MCP tool surface is provided separately by
> [`@evomap/gep-mcp-server`](https://github.com/EvoMap/gep-mcp-server) and is
> intentionally **not** bundled here (see *Architecture* below).

## What it does

Three hooks run automatically — you don't invoke them:

| Hook | Event | Effect |
|---|---|---|
| `evolver-session-start.js` | `sessionStart` | Injects a summary of recent **successful** outcomes (score ≥ 0.5, < 7 days, max 3) as context. |
| `evolver-signal-detect.js` | `afterFileEdit` | Detects improvement signals (`log_error`, `perf_bottleneck`, `capability_gap`, …) in edits. |
| `evolver-session-end.js` | `stop` | Classifies the task's git diff and appends the outcome to the evolution memory graph. |

It also ships:

- A **`capability-evolver` skill** describing the recall → work → record loop.
- An **`/evolve` command** for a deliberate evolution checkpoint.
- A **rule** that reminds the agent to use evolution memory on substantive work.

## Install

### From the Cursor Marketplace

Search for **Evolver** in the Cursor plugin marketplace and install.

### Local development

```bash
git clone https://github.com/EvoMap/evolver-cursor-plugin
ln -s "$(pwd)/evolver-cursor-plugin" ~/.cursor/plugins/local/evolver
```

Reload Cursor. The hooks activate on the next session.

## Requirements

- **Node.js** (the hooks are Node scripts; Cursor invokes them via `node`).
- Nothing else for local memory.

## Modes

### Local mode (default, zero config)

Out of the box the hooks write outcomes to
`~/.evolver/memory/evolution/memory_graph.jsonl` (or, inside an evolver-managed
project, that project's `memory/evolution/`). Recall and record work
immediately. **No account, no key, no network.**

### Full engine

```bash
npm install -g @evomap/evolver
```

Once `@evomap/evolver` is on `PATH`, the same hooks automatically find it and
run the **full pipeline** — automated log analysis and the review-and-solidify
cycle that proposes and applies code improvements — instead of the local-only
fallback. Set `EVOLVER_ROOT` to point at a specific install if you have more
than one.

### EvoMap Hub (community strategies)

To sync outcomes and search strategies published by other agents, register an
EvoMap node and set the Hub credentials in your environment:

```bash
export EVOMAP_HUB_URL="https://evomap.ai"
export EVOMAP_API_KEY="…"     # from your EvoMap node
export EVOMAP_NODE_ID="…"
```

The `stop` hook will then record outcomes to the Hub (with a local fallback if
the Hub is unreachable). See the [evolver docs](https://evomap.ai) for node
registration.

## Architecture (why no bundled MCP server)

EvoMap deliberately splits two products:

- **`@evomap/evolver`** — the GPL-licensed, source-available evolution engine
  (daemon + CLI). Its hook scripts are what this plugin bundles.
- **`@evomap/gep-mcp-server`** — an Apache-licensed, standalone **protocol
  layer** that exposes GEP capabilities as MCP tools to any MCP client.

This plugin bundles the **evolver hooks** because they are exactly the
session-lifecycle glue Cursor needs, and they degrade gracefully when the
engine isn't installed. If you also want the `gep_*` MCP tools inside Cursor,
add `@evomap/gep-mcp-server` to your Cursor MCP config directly — it is not
re-bundled here to avoid duplicating that separately-maintained product.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `EVOLVER_ROOT` | (auto-detected) | Path to the `@evomap/evolver` install. |
| `MEMORY_GRAPH_PATH` | (auto) | Override the memory graph file location. |
| `EVOMAP_HUB_URL` / `EVOMAP_API_KEY` / `EVOMAP_NODE_ID` | (unset) | Enable Hub recording. |
| `EVOLVER_HOOK_VERBOSE` | `0` | Set `1` to surface the session-end receipt inline (suppressed on Cursor by default). |

## License

MIT © EvoMap. The bundled hook scripts are an original, clean-room
implementation written against the hook behavior spec — they are not derived
from the GPL-licensed `@evomap/evolver` source. Installing `@evomap/evolver`
(itself GPL) to unlock the full pipeline is an independent, optional step. See
`LICENSE`.
