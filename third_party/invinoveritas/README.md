# invinoveritas

Cursor plugin that connects agents to [invinoveritas](https://api.babyblueviper.com) through its
official remote [Model Context Protocol](https://modelcontextprotocol.io/) server — an
independent, signed pre-action verdict before an irreversible action (a destructive command, a
production deploy, a merge to `main`), and a recomputable proof after.

Built for the class of workflow this ecosystem is moving toward: many agents branching, resolving
conflicts, and merging with little or no human review per action. A verdict from a party that
isn't the one being judged is a real, checkable second opinion on that path — not a human gate,
an independent one, and it never blocks: it's advisory, you stay fully autonomous and decide.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **invinoveritas**.
3. Click **Install**, then set your invinoveritas API key (below).

Or run `/add-plugin invinoveritas` in chat.

## MCP

```json
{
  "mcpServers": {
    "invinoveritas": {
      "type": "http",
      "url": "https://api.babyblueviper.com/mcp",
      "headers": {
        "Authorization": "Bearer ${IVV_API_KEY}"
      }
    }
  }
}
```

## Setup

invinoveritas authenticates with a **Bearer API key** — free, instant, no payment required to
register.

### 1. Get an API key

```bash
curl -s -X POST https://api.babyblueviper.com/register \
  -H "Content-Type: application/json" \
  -d '{"label": "cursor-agent"}'
```

Returns an `api_key`. Free try-it calls work immediately; fund the account (Lightning, x402/USDC,
or card) before high-volume or paid-tier use.

### 2. Configure the plugin

In **Dashboard → Plugins → Configure**, set **invinoveritas API key** to the value you just
generated.

## What the skill does

The bundled `pre-action-review` skill teaches the agent when to call the `review` tool — before a
destructive shell command, a merge, a deploy, a migration, or any action that would be hard to
cleanly undo — and how to act on a `reject`/`approve_with_concerns`/`approve` verdict without
silently swallowing concerns. See `skills/pre-action-review/SKILL.md` for the full guidance.

## Docs

- Live tool list + schemas: https://api.babyblueviper.com/.well-known/mcp/server-card.json
- Free proof verification (no auth, no account): `POST https://api.babyblueviper.com/verify-proof`
- Public, signed verdict track record: https://api.babyblueviper.com/ledger

## License

MIT
