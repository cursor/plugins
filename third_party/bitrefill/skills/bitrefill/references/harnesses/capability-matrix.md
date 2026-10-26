# Capability Matrix

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

Per-host harness capabilities + **autonomy-first ranked stacks**. Probe at runtime — [decision-engine.md](decision-engine.md).

Legend: **MCP** → [../touchpoints/mcp.md](../touchpoints/mcp.md) | **x402** → [../touchpoints/x402.md](../touchpoints/x402.md) | **CLI** → [../touchpoints/cli.md](../touchpoints/cli.md) | **API** → [../touchpoints/api.md](../touchpoints/api.md) | **Browse** → [../touchpoints/browse.md](../touchpoints/browse.md) | **OpenClaw** → [openclaw.md](openclaw.md) | **Claude Chat** → [claude-chat.md](claude-chat.md)

Columns: **Exec** = code/shell | **Egress** = net to Bitrefill | **Ranked stack** = touchpoint + wallet (lowest HITL first)

## Anthropic

Claude Chat: `show_widget` **or** `read_me` **or** MCP connectors on claude.ai → [claude-chat.md](claude-chat.md) §1. Sandbox exec always; egress — probe.

| Host | Exec | Egress | MCP | Browser | Ranked stack (autonomy-first) |
|------|------|--------|-----|---------|------------------------------|
| Claude.ai Free | Sandbox exec yes; no agent shell | MCP: no custom connectors; egress: probe | No | Chrome ext only | Link only |
| Claude.ai Pro+ | Sandbox exec yes; no agent shell | **MCP** connectors; sandbox egress: **probe** | Yes | Chrome ext | MCP + balance → MCP + Base x402 → x402 REST via Base |
| Cowork | Desktop shell | MCP + host | Yes | Chrome ext | MCP + balance → MCP + Base x402 → CLI |
| Claude Desktop | No | MCP only | Yes | Chrome ext | MCP + balance → MCP + Base x402 |
| Claude Code | Full shell | Direct + MCP | Yes | Chrome ext | MCP + balance → MCP + Base x402 → CLI → x402 REST |

**Claude Chat network paths:** (1) chat **MCP** (always for configured connectors), (2) **code sandbox** (Team: egress on/package mgrs; Enterprise: off; Pro/Max: user-controlled), (3) legacy **Analysis tool** (browser, no net). Bitrefill routing: **MCP only** → [claude-chat.md](claude-chat.md) §3.

## OpenAI

| Host | Exec | Egress | MCP | Browser | Ranked stack |
|------|------|--------|-----|---------|--------------|
| ChatGPT Free | No | None | No | Datacenter | Link only |
| ChatGPT Plus+ / Desktop | Sandbox **no net** | **MCP host yes** | Yes | Datacenter | MCP + balance → **Base MCP x402 REST** (no Bitrefill account) |
| ChatGPT Atlas | Limited | MCP + residential | Yes | **Residential** | MCP buy; Browse explore-only |
| ChatGPT Agent | Sandbox shell | MCP + curl | Yes | Datacenter | MCP → CLI → Base x402 |
| Codex CLI | Full shell | Allowlistable | Yes | MCP only | MCP + balance → CLI → AgentCash/awal |

**ChatGPT:** Code Interpreter can't curl; Base MCP `web_request` proxies `api.bitrefill.com` — full x402 shop without Bitrefill MCP when dual-connector configured.

## Google

| Host | Exec | Egress | MCP | Browser | Ranked stack |
|------|------|--------|-----|---------|--------------|
| Gemini Free | No | None | No | No | Link only |
| Gemini Pro/Ultra | Limited | Google IPs | Limited | Auto Browse (often blocked) | MCP → CLI → link |
| Gemini CLI | Full shell | Direct + MCP | Yes | MCP | MCP + balance → CLI → API |
| Jules | VM shell | VM egress | No | No | CLI → API (batch only) |

## Other hosts

| Host | Exec | Egress | MCP | Browser | Ranked stack |
|------|------|--------|-----|---------|--------------|
| Cursor | Terminal | Direct + MCP | Yes (40-tool cap) | Built-in | MCP + balance → Base x402 → CLI |
| OpenCode | Full shell | Direct + MCP | Yes | MCP | MCP + balance → CLI |
| **OpenClaw / Pi** | `exec` | Host IP | Yes | Host IP | **Guest CLI exec** → balance → MCP → x402 |
| **Hermes** | `terminal` | Backend-dependent | Yes | Local/CDP | MCP (API key cron) → CLI → avoid cloud browse |

## Wallet availability by host

| Wallet | Typical hosts | Bitrefill pairing |
|--------|---------------|-------------------|
| Bitrefill balance | Any OAuth'd MCP/CLI | Lowest HITL — pre-fund cap |
| Base MCP | Cursor, ChatGPT+, Claude+connector | x402 REST Path 1, MCP invoice pay |
| AgentCash | OpenClaw, Hermes, Codex (local MCP) | Autonomous x402 |
| CDP awal | Codex, OpenClaw, Hermes | Autonomous x402 under caps |
| Phantom MCP | Cursor (connector) | SIWX sign only — pair with Base/Bitrefill MCP for HTTP |
| MetaMask mm CLI | Codex, Claude Code, OpenClaw | Manual sign — not autonomous |

Full wallet matrix → [../wallets/matrix.md](../wallets/matrix.md).

## Quick decision

1. OpenClaw? → [openclaw.md](openclaw.md) — guest CLI first.
2. Claude Chat (claude.ai + `show_widget`)? → [claude-chat.md](claude-chat.md) — MCP-first + generative UI.
3. `search-products` visible? → [../touchpoints/mcp.md](../touchpoints/mcp.md) + [../wallets/payment.md](../wallets/payment.md).
4. Base MCP `web_request` + guest USDC? → [../touchpoints/x402.md](../touchpoints/x402.md) Path 1.
5. Shell, no MCP? → [../touchpoints/cli.md](../touchpoints/cli.md).
6. Else → [decision-engine.md](decision-engine.md) full probe.

**User hears:** never host names or ranked stacks — open with the product goal.
