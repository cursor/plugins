---
name: bitrefill
description: "Buy or browse Bitrefill — 1,500+ gift cards, mobile top-ups, eSIMs, 180+ countries. Capability routing: probe harness (exec, egress, MCP), pick touchpoint (Bitrefill MCP, x402 REST via Base MCP, CLI, API, browse), wallet (balance, x402, send). Confirms each purchase with the user. Triggers: Bitrefill, gift cards, mobile top-up, eSIM, crypto, Lightning, USDC, x402."
compatibility: "Routes by harness × touchpoint × wallet. Touchpoints: Bitrefill MCP (OAuth), x402 REST (Base MCP web_request → api.bitrefill.com), CLI ≥0.3.0, v2 REST, residential browse. Wallets: Bitrefill balance, Base MCP, AgentCash, CDP awal, Phantom/MetaMask sign-only. OpenClaw + Claude Chat: dedicated harness guides."
metadata:
  author: bitrefill
  version: "3.3.0"
  homepage: "https://www.bitrefill.com"
  docs: "https://docs.bitrefill.com"
  repository: "https://github.com/bitrefill/agents"
---

# Bitrefill

Digital goods (gift cards, mobile top-ups, eSIMs) — 180+ countries, 1,500+ brands. Pay: crypto, Lightning, USDC x402, pre-funded balance.

Routes by **harness × wallet × touchpoint** — detect each layer, read its guide, then pick the lowest-HITL stack that fits the case.

## User-facing language

Concierge voice — crypto should feel like buying a gift card, not wiring a wallet. Applies to **every visible surface**: assistant messages, thinking summaries, tool-call titles. **Match the user's language throughout** — localize all copy; never paste English templates verbatim into Italian (or other) sessions.

**Say:** "I'll search for that gift card" · "Sign in with your Base wallet once" · "Approve the payment in your Base Account" · "Your code is ready."

**Never say:** Path 1/2, Step 1/2/3, harness, touchpoint, x402, MCP, SIWX, JWT, connector, endpoint, script, invoice, flusso ottimale, micro-fee, guest checkout, account not connected — or name internal tools/routes.

| Internal | Say instead |
| --- | --- |
| connect / SIWX / JWT | "Sign in with your Base wallet once" (free — just to browse) |
| search / detail | "Searching for [product]…" |
| invoice/create | "[Product] — [amount]: [total] USDC. Confirm?" |
| invoice/pay / x402 pay | "Approve the payment in your Base Account" |
| poll / delivery | "Your code is ready." |

**Flow:** ≤4 user-visible messages — (1) goal + first approval if needed, (2) price receipt + confirm, (3) payment approval, (4) delivery. Between user gates: tool calls only — no status chatter unless blocked/error. Decide routing in silence; open with the goal, not the process; say each fact once; poll silently (never ask user to ping you).

**Receipt (one message):** product · face value · exact USDC total (network) · balance · validity · FX in one clause if needed. **Delivery:** code + non-refundable once, neutrally.

**Reference doc banner** (copy verbatim to top of each guide): *Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.*

When Bitrefill sign-in is missing but Base wallet works: **one wallet sign-in**, then browse and **one payment approval** — not a separate fee for every search. Host-specific copy → [claude-chat.md](references/harnesses/claude-chat.md) § User voice.

## How to route

Safeguards → [safeguards.md](references/safeguards.md). Then three phases — **read the guide for each layer before acting**:

### 1. Detect harness → read harness instructions

Probe what host you are on (exec/shell, egress, MCP connectors, browser, generative UI). Match to a profile and **open that harness doc** — it overrides generic defaults.

| If you detect | Read |
| --- | --- |
| Claude Chat (`show_widget` or `read_me`, MCP on claude.ai) | [claude-chat.md](references/harnesses/claude-chat.md) |
| OpenClaw (`~/.openclaw/`, `openclaw` on PATH) | [openclaw.md](references/harnesses/openclaw.md) |
| Grok Bot or Cursor (Bot cloud computer; Cursor IDE, CLI or cloud agent) | [grok-bot.md](references/harnesses/grok-bot.md) |
| Known host, need defaults | [capability-matrix.md](references/harnesses/capability-matrix.md) |
| Probe signals + derivation rules | [decision-engine.md](references/harnesses/decision-engine.md) § Phase 1 |

Harness doc tells you what is **off limits** (no CLI on Claude Chat, no sandbox curl, etc.) and any host-specific ranked stack.

### 2. Detect wallets → read wallet instructions

Probe payment capabilities available **in this session** (independent of catalog channel):

| Signal | Wallet doc |
| --- | --- |
| Signed-in Bitrefill + pre-funded balance | [payment.md](references/wallets/payment.md) — `balance` + `auto_pay` |
| Base MCP (`get_wallets`, `sign`, x402, `send`) | [base-mcp.md](references/wallets/base-mcp.md); guest sign-in → [siwx.md](references/wallets/siwx.md) |
| AgentCash / CDP awal | [agentcash.md](references/wallets/agentcash.md), [cdp-awal.md](references/wallets/cdp-awal.md) |
| Phantom / MetaMask (sign-only) | [phantom.md](references/wallets/phantom.md), [metamask.md](references/wallets/metamask.md) |
| Ranking across wallets | [matrix.md](references/wallets/matrix.md) |

Full probe list → [decision-engine.md](references/harnesses/decision-engine.md) § Phase 2.

### 3. Pick touchpoint × wallet for this case

Cross **harness limits**, **wallet availability**, and **intent** (browse vs buy; Bitrefill account vs guest USDC). Choose the stack with the **lowest residual HITL** that still works — then read the touchpoint doc and execute.

**Touchpoint** (catalog/checkout channel — first viable match):

| If | Read |
| --- | --- |
| `search-products` / `buy-products` visible (OAuth or API key) | [mcp.md](references/touchpoints/mcp.md) |
| Base MCP `web_request` + guest USDC, no Bitrefill account | [x402.md](references/touchpoints/x402.md) — wallet sign-in (Path 1), not pay-per-call |
| Shell + npm, no Bitrefill MCP | [cli.md](references/touchpoints/cli.md) |
| Direct HTTP only | [api.md](references/touchpoints/api.md) |
| Browse-only + residential browser | [browse.md](references/touchpoints/browse.md) |
| None viable | Send user `bitrefill.com` link |

**Wallet at pay time** — pick best available for the chosen touchpoint → [payment.md](references/wallets/payment.md), [matrix.md](references/wallets/matrix.md). Typical pairings:

| Touchpoint | Prefer wallet |
| --- | --- |
| Bitrefill MCP | `balance` + `auto_pay` → Base MCP pay → payment link |
| Guest checkout (x402 REST) | AgentCash / awal → Base MCP sign-in + pay → never pay-per-call browse when sign-in works |
| CLI | Same wallet rank as above at `buy-products` time |

Conflict resolution + global rank → [decision-engine.md](references/harnesses/decision-engine.md) § Phase 3.

## Top spending safeguards

**Real-money transactions.** Codes instant; digital goods non-refundable once fulfilled.

- **Confirm before buy** unless user opted autonomous purchasing this session.
- **Codes = cash** — never paste public channels; prefer in-memory.
- **Dedicated low-balance account** for autonomous buying — never give agent wallet seeds. Skill **not a wallet**.
- **Log every purchase** — `invoice_id`, product, amount, payment method.

Full safeguards + per-host hardening → [safeguards.md](references/safeguards.md).

## References

### Harnesses

| File | Use when |
| --- | --- |
| [decision-engine.md](references/harnesses/decision-engine.md) | Capability probe + derivation |
| [capability-matrix.md](references/harnesses/capability-matrix.md) | Per-host exec / egress / ranked stacks |
| [openclaw.md](references/harnesses/openclaw.md) | OpenClaw Gateway — guest CLI via `exec` |
| [claude-chat.md](references/harnesses/claude-chat.md) | claude.ai — MCP-first + `show_widget` |

### Touchpoints

| File | Use when |
| --- | --- |
| [mcp.md](references/touchpoints/mcp.md) | Bitrefill MCP OAuth'd |
| [x402.md](references/touchpoints/x402.md) | x402 REST via Base MCP or direct egress |
| [cli.md](references/touchpoints/cli.md) | Shell + `@bitrefill/cli` ≥ 0.3.0 |
| [cli-headless-auth.md](references/touchpoints/cli-headless-auth.md) | AgentMail / magic-link sign-in |
| [api.md](references/touchpoints/api.md) | v2 REST — Personal / Business / Affiliate |
| [browse.md](references/touchpoints/browse.md) | Residential browser explore-only |

### Wallets

| File | Use when |
| --- | --- |
| [matrix.md](references/wallets/matrix.md) | Wallet × touchpoint × HITL ranking |
| [payment.md](references/wallets/payment.md) | Pay-time decision tree |
| [base-mcp.md](references/wallets/base-mcp.md) | Base MCP `web_request`, x402, `send` |
| [siwx.md](references/wallets/siwx.md) | Connect → JWT, redemption SIWX |
| [agentcash.md](references/wallets/agentcash.md) | Autonomous x402 via `fetch` |
| [cdp-awal.md](references/wallets/cdp-awal.md) | Coinbase Agentic Wallet / awal |
| [metamask.md](references/wallets/metamask.md) | MetaMask Agent Wallet (`mm` CLI) |
| [phantom.md](references/wallets/phantom.md) | Phantom MCP sign-only |

### Cross-cutting

| File | Use when |
| --- | --- |
| [safeguards.md](references/safeguards.md) | Spending policy + host hardening |
| [troubleshooting.md](references/troubleshooting.md) | Errors across all paths |

## Source of truth

Skill summarizes + routes. Exhaustive enums → <https://docs.bitrefill.com>.
