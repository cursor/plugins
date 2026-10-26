# Wallet: Coinbase CDP (awal)

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

Coinbase Agentic Wallet — TEE-backed signing, configurable spending caps. Strong autonomous x402 under limits.

Docs: [docs.cdp.coinbase.com/agentic-wallet](https://docs.cdp.coinbase.com/agentic-wallet/welcome)

## Surfaces

| Surface | Use |
| --- | --- |
| `npx awal x402 pay <url>` | CLI x402 buyer from shell |
| `@coinbase/payments-mcp` | MCP `make-x402-request` |
| AgentKit `@x402/fetch` | In-agent code with supplied signer |

## Capabilities

| Capability | CDP awal |
| --- | --- |
| HTTP proxy | Agent/shell makes HTTP; awal wraps x402 pay |
| x402 | **Auto within session/tx caps** |
| SIWX | Manual in agent code (or Bitrefill JWT path via Base MCP) |
| Keys | Remote TEE — agent never holds keys |
| Base USDC | Yes (+ Polygon, Solana x402) |
| HITL | Email OTP auth once; autonomous under caps |

## Bitrefill pairing

| Touchpoint | Flow |
| --- | --- |
| x402 REST | `awal x402 pay https://api.bitrefill.com/x402/...` |
| MCP/CLI invoice | Pay `x402_payment_url` from `buy-products` response |

Rank **#3** in [matrix.md](matrix.md).

## Setup

1. CDP Agentic Wallet auth (email OTP).
2. Set session + per-transaction spending limits.
3. Fund USDC on Base within cap.

## Hosts

Codex CLI, OpenClaw (`exec`), Hermes (`terminal`), any shell host.

## Example

```bash
npx awal x402 pay "https://api.bitrefill.com/x402/gift-cards/search?q=amazon&country=US"
```

Invoice pay: URL/method/body from 402 envelope or `x402_payment_url`.

## Security

- Caps = primary blast-radius control.
- Never unlimited awal caps on production accounts.

**User hears:** "[Product] — [amount]: [total] USDC. Confirm?" → "Your code is ready." (never "awal" or "x402")
