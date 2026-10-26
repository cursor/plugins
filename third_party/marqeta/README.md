# Marqeta

Cursor plugin that connects agents to [Marqeta](https://www.marqeta.com/)'s card-issuing platform through Marqeta's official [Model Context Protocol](https://modelcontextprotocol.io/) server, [`@marqeta/marqeta-mcp`](https://github.com/marqeta/marqeta-mcp), run locally by Cursor.

Look up cardholders, cards, card products, transactions, disputes, and spend controls in plain language — for example "show me the last 10 declined transactions for this user" or "what velocity limits apply to this card product".

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Marqeta**.
3. Click **Install**, then set the Marqeta API URL and credentials (below).

Or run `/add-plugin marqeta` in chat.

## MCP

```json
{
  "mcpServers": {
    "marqeta": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@marqeta/marqeta-mcp"
      ],
      "env": {
        "MARQETA_API_URL": "${MARQETA_API_URL}",
        "MARQETA_USERNAME": "${MARQETA_USERNAME}",
        "MARQETA_PASSWORD": "${MARQETA_PASSWORD}",
        "MARQETA_SCOPE": "read"
      }
    }
  }
}
```

Marqeta does not publish a hosted MCP endpoint. Its official server runs locally over stdio and authenticates to the Marqeta Core API with HTTP Basic credentials.

## Before you connect

1. Create a free public sandbox account at [auth.marqeta.com/create-account](https://auth.marqeta.com/create-account), or use your program's credentials.
2. Copy the **application token** and **admin access token** from [app.marqeta.com/development](https://app.marqeta.com/development).
3. Set these values in **Dashboard → Plugins → Configure**:
   - `MARQETA_API_URL` — e.g. `sandbox-api.marqeta.com`
   - `MARQETA_USERNAME` — application token
   - `MARQETA_PASSWORD` — admin access token
   - `MARQETA_PROGRAM_SHORT_CODE` — only for non-sandbox programs; adds the `X-Program-Short-Code` header

## Read-only by default

The plugin sets `MARQETA_SCOPE=read`, which loads only the 25 read tools. To enable the 8 write tools (create and update cards, card state transitions, dispute cases, and velocity controls), remove `MARQETA_SCOPE` or set it to `all`. Use `MARQETA_SERVICE` (e.g. `users,cards,transactions`) to load only specific services.

## What agents can do

| Service | Capabilities |
| --- | --- |
| Users | List and look up cardholders, child accounts, and notes |
| Cards | Look up cards by token, user, last four, or barcode; create and update cards (write) |
| Card products | List and retrieve card products |
| Card transitions | View card state history; activate, suspend, or terminate cards (write) |
| Transactions | List and retrieve transactions and related transactions |
| Disputes | List dispute cases; open fraud disputes (write) |
| Velocity controls | View spend limits and balances; create, update, or deactivate limits (write) |

The server is the source of truth for tool names and schemas.

## Notes

- Write tools can modify live data. Test in the sandbox first and require confirmation for write tool calls.
- Some read tools return sensitive data (full PAN, identification numbers). Use credentials with minimal permissions.

## Docs

- Marqeta API: https://docs.marqeta.com
- Server source: https://github.com/marqeta/marqeta-mcp

Logo is the avatar of the verified `marqeta` GitHub organization. The submitted logo URL, marqeta.com, and docs.marqeta.com were unreachable from the build environment when this plugin was added.

## License

MIT
