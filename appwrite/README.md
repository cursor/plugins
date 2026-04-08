# Appwrite plugin

Official-style integration pattern: **skills** teach when and how to use Appwrite safely; **MCP** (`mcp-server-appwrite` via `uvx`) performs live API operations.

## MCP setup

1. Install [uv](https://docs.astral.sh/uv/getting-started/installation/) so `uvx` is available.
2. Create an Appwrite API key with the scopes you are willing to expose to the assistant.
3. In `.mcp.json`, replace placeholders—or override env vars in **Cursor Settings → MCP** for this server.
4. For self-hosted Appwrite, set `APPWRITE_ENDPOINT` to your instance API URL (see Appwrite docs for the `/v1` base).

## Tool surface

Additional APIs (users, storage, functions, …) are opt-in flags on `mcp-server-appwrite` to control context size.
