# Path: MCP

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

**Preferred purchase channel.** Typed tool calls, OAuth or API key, no shell, 10+ hosts.

## Two MCP servers

### eCommerce MCP — purchases

URL: `https://api.bitrefill.com/mcp` (OAuth) **or** `https://api.bitrefill.com/mcp/YOUR_API_KEY` (key-in-path).

7 tools:

- `search-products` — keyword + country + category
- `get-product-details` — packages (denominations) + pricing
- `buy-products` — create invoice
- `submit-prepayment-step` — multi-step bill-payment forms
- `get-invoice-by-id` — poll status + redemption info
- `list-invoices` — history
- `update-order` — track balance / archive orders

Auth: OAuth (interactive) or API key from <https://www.bitrefill.com/account/developers>.

### Development MCP — docs only

URL: `https://docs.bitrefill.com/mcp`. Docs index for code-help. **Not purchases.** Integration authoring only.

## Per-client setup

### Cursor / Grok Bot

**Bitrefill** plugin (Cursor: **Customize**; Grok Bot: **Connect apps**) bundles eCommerce MCP via `.mcp.json`; sign in when asked (Cursor CLI: `agent mcp login <id>`, id from `agent mcp list`). Manual setup if plugin not installed — `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "bitrefill": { "url": "https://api.bitrefill.com/mcp" }
  }
}
```

Keep `buy-products` **out** of every allowlist → [../safeguards.md](../safeguards.md) § Cursor / Grok Bot. 40-tool cap across all servers.

### Claude Code

**bitrefill** plugin from this repo auto-registers eCommerce MCP via `.mcp.json`. Manual setup if plugin not installed:

```bash
claude mcp add bitrefill --url https://api.bitrefill.com/mcp
```

Or edit `~/.claude.json`. Output cap: `MAX_MCP_OUTPUT_TOKENS` (default 25000).

### Claude Desktop — `claude_desktop_config.json`

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`. Windows: `%APPDATA%\Claude\claude_desktop_config.json`.

```json
{
  "mcpServers": {
    "bitrefill": { "url": "https://api.bitrefill.com/mcp" }
  }
}
```

### Claude.ai (web) — Pro / Max / Team / Enterprise

Settings → Connectors → Add → `https://api.bitrefill.com/mcp`. Free can't add custom URLs.

Harness (MCP-first + `show_widget`) → [../harnesses/claude-chat.md](../harnesses/claude-chat.md).

### ChatGPT (Plus / Pro / Business / Enterprise / Edu)

Settings → Apps & Connectors → Add → `https://api.bitrefill.com/mcp`. **Developer Mode** for `buy-products` (write tool). Free blocked.

### Codex CLI — `~/.codex/config.toml`

```toml
[mcp_servers.bitrefill]
url = "https://api.bitrefill.com/mcp"
bearer_token_env_var = "BITREFILL_API_KEY"
```

OAuth: `codex mcp login bitrefill`.

### Gemini CLI — `~/.gemini/settings.json` (or project `.gemini/settings.json`)

```json
{
  "mcpServers": {
    "bitrefill": {
      "url": "https://api.bitrefill.com/mcp",
      "headers": { "Authorization": "Bearer ${BITREFILL_API_KEY}" }
    }
  }
}
```

OAuth: `gemini mcp auth bitrefill`.

### OpenCode — `opencode.jsonc`

```jsonc
{
  "mcp": {
    "bitrefill": {
      "url": "https://api.bitrefill.com/mcp",
      "headers": { "Authorization": "Bearer ${BITREFILL_API_KEY}" }
    }
  }
}
```

### OpenClaw → [../harnesses/openclaw.md](../harnesses/openclaw.md)

```bash
openclaw mcp set bitrefill --url "https://api.bitrefill.com/mcp/$BITREFILL_API_KEY"
```

## Workflow

```
search-products  →  get-product-details  →  buy-products  →  get-invoice-by-id
```

1. **Search** — `search-products(...)`. *(say: "Searching for [product]…" — tool title: "Search gift cards")*
2. **Get price** — `get-product-details(..., currency="USDC")`. *(silent)*
3. **Prepare order** — `buy-products(...)`. Max 15 items. Confirm with user first. *(say: "[Product] — [amount]: [total] USDC. Confirm?")*
4. **Pay** → [../wallets/payment.md](../wallets/payment.md): `balance` + `auto_pay` → Base MCP pay → `send`. *(say: "Approve the payment in your Base Account")*
5. **Deliver** — `get-invoice-by-id` until complete. *(say: "Your code is ready.")*

Logging per [../safeguards.md](../safeguards.md).

## Caveats

- **ChatGPT** custom MCP needs Plus+; write tools need Developer Mode (admin on workspaces).
- **Cursor** 40-tool cap.
- **Claude.ai** consumer needs Pro+ for custom URLs.
- **Claude Chat network:** sandbox egress varies by plan; **MCP connectors work regardless**. Legacy Analysis tool (browser JS) has no net. Route Bitrefill via MCP — not sandbox curl. → [../harnesses/claude-chat.md](../harnesses/claude-chat.md) §3.

## Source of truth

- <https://docs.bitrefill.com/docs/ecommerce-mcp> | <https://docs.bitrefill.com/docs/development-mcp> | <https://docs.bitrefill.com/docs/setup-guides>
- Per-client: <https://docs.bitrefill.com/docs/use-with-cursor>, `/use-with-claude-chat`, `/use-with-claude-code`, `/use-with-chatgpt`

**User hears:** "Searching for [product]…" → "[Product] — [amount]: [total] USDC. Confirm?" → "Approve the payment in your Base Account" → "Your code is ready."
