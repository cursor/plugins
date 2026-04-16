# Sverklo Code Intelligence

Local-first code intelligence MCP server for Cursor. Hybrid search, impact analysis, diff-aware PR review, persistent memory, and more — running entirely on your machine.

## What you get

- **22 MCP tools** — semantic search, symbol lookup, blast-radius analysis, PR review, memory, clusters, wiki
- **3 skills** — onboard to a codebase, review changes, plan safe refactors
- **Hybrid search** — BM25 + ONNX embeddings + PageRank via Reciprocal Rank Fusion
- **Persistent memory** — decisions survive across sessions, tied to git state
- **100% local** — no API keys, no cloud, MIT licensed

## Install

```bash
npm install -g sverklo
```

The plugin auto-configures the MCP server. After install, Cursor's agent has access to all 22 sverklo tools.

## Links

- [Website](https://sverklo.com)
- [GitHub](https://github.com/sverklo/sverklo)
- [Benchmarks](https://sverklo.com/benchmarks)
