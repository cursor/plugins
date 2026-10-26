# Wallet: AgentCash

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

Local MCP wallet — **`fetch`** tool: payment-aware HTTP, handles SIWX + x402 automatically. **Highest autonomous x402** for headless agents when pre-funded.

Docs: [agentcash.dev](https://agentcash.dev/docs/mcp-mode)

## Capabilities

| Capability | AgentCash |
| --- | --- |
| HTTP proxy | **Yes** — `fetch` = full HTTP + x402 buyer |
| x402 | **Automatic** on 402 |
| SIWX | **Automatic** in `fetch` before x402 |
| Keys | Local — `~/.agentcash/wallet.json` or `X402_PRIVATE_KEY` |
| Base USDC | Yes (primary) |
| HITL | Fund once; optional env caps |

## Bitrefill pairing

| Touchpoint | Flow |
| --- | --- |
| x402 REST Path 1 | `fetch` handles connect SIWX, JWT, micro-fees, `invoice/pay` |
| Bitrefill MCP / CLI | `fetch` or `awal x402 pay` on `x402_payment_url` from invoice |

Rank **#2** in [matrix.md](matrix.md) — after Bitrefill `balance` + `auto_pay`.

## Setup

1. Install AgentCash MCP (stdio) in host config.
2. Fund small USDC on Base.
3. Set spending caps in env if available.

## Hosts

OpenClaw, Hermes, Codex CLI, Cursor (local MCP), cron/automation.

## Security

- Local private key — treat `~/.agentcash/wallet.json` as sensitive.
- Pre-fund only session spend cap.
- Still confirm purchases per [../safeguards.md](../safeguards.md) unless user opts autonomous session.

## vs Base MCP

AgentCash: autonomous x402, no per-tx Base Account click. Base MCP: user approves each payment — better when user wants per-pay review.

**User hears:** same as any purchase — "[Product] — [amount]: [total] USDC. Confirm?" → "Your code is ready." (no wallet jargon even when autonomous)
