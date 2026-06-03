# LogRocket Plugin for Cursor

Connect Cursor to [LogRocket](https://logrocket.com) to query session replays, metrics, issues, and user behavior using natural language.

Powered by the [LogRocket MCP Server](https://docs.logrocket.com/docs/mcp) and [Ask Galileo](https://docs.logrocket.com/docs/ask-galileo).

## What's Included

- **MCP Server** — Connects Cursor to the LogRocket API so your AI agent can query sessions, metrics, issues, and more. All toolsets are enabled (`?toolsets=all`), exposing `use_logrocket`, `find_sessions`, `watch_sessions`, `build_metric`, `list_organizations`, and `list_projects`.
- **Use LogRocket Skill** — A skill that teaches your agent how to invoke LogRocket queries on your behalf.

## Setup

1. Install the plugin.
2. Connect to the MCP server when prompted by Cursor, and authenticate via OAuth.

The server connects to the root `https://mcp.logrocket.com/mcp` endpoint, so your agent can access the same LogRocket organizations and projects you can access in your browser. No environment variables required — use the `list_organizations` / `list_projects` tools to pick a specific org or project.

## Learn More

- [LogRocket MCP Server Docs](https://docs.logrocket.com/docs/mcp)
- [Ask Galileo Docs](https://docs.logrocket.com/docs/ask-galileo)
