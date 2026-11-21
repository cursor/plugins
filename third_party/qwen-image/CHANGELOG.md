# Changelog

## 1.0.1

- Reuse the existing hosted Qwen Image MCP instead of bundling a local Node server. The hosted server exposes generation, editing, model listing, and same-task retrieval tools.
- Clarify that `finished_at: null` remains pending even if an interim response says `success: false`.

## 1.0.0

- Initial Qwen Image Cursor plugin with a small local MCP server for generation and same-task retrieval.
