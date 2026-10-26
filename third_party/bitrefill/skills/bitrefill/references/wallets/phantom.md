# Wallet: Phantom MCP

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

Official Phantom embedded wallet MCP for agent signing. **No HTTP proxy** — pair with Bitrefill MCP or Base MCP for API calls.

Docs: [docs.phantom.com/phantom-mcp-server](https://docs.phantom.com/phantom-mcp-server)

## Tools (representative)

| Tool | Role |
| --- | --- |
| `wallet_status` | Session check (no re-auth) |
| `wallet_addresses` | Solana, Ethereum (incl. Base), Bitcoin, Sui |
| `wallet_balances` | Token balances — **may fail MCP schema validation** (known issue) |
| `evm_sign` | EIP-191 `personal_sign` — SIWX |
| `evm_sign-typed` | EIP-712 — x402 EIP-3009 |
| `evm_send` | EVM tx — simulation preview, then `confirmed: true` |
| `simulate` | Tx/message preview without sending |
| `pay` | **Phantom API quota only** — not generic x402 HTTP |

## Capabilities

| Capability | Phantom MCP |
| --- | --- |
| HTTP proxy | **None** |
| x402 buyer | **None** — manual typed-data + agent HTTP retry |
| SIWX | `evm_sign` (chainId `8453` for Base) |
| HITL | `evm_send` requires simulation + `confirmed: true` |
| Base USDC | Yes via EVM address |

## Bitrefill pairing

**Triple-MCP pattern (Cursor):**

1. **Bitrefill MCP** — catalog + `buy-products` when OAuth'd
2. **Base MCP** — `initiate_x402_request` on `x402_payment_url` (preferred pay)
3. **Phantom** — SIWX only if Phantom wallet is payer: Base MCP `web_request` for HTTP + Phantom `evm_sign` for header

Don't use Phantom `pay` for Bitrefill x402.

Rank **#7** in [matrix.md](matrix.md) — sign-only fallback.

## Smoke-tested (Cursor)

| Test | Result |
| --- | --- |
| `wallet_status` | Connected |
| `wallet_addresses` | EVM address returned |
| `evm_sign` (Base, test message) | Signature returned |
| `wallet_balances` networks=`base` | Schema validation error (server-side) |

## Security

- Agent embedded wallet — not user's main Phantom extension.
- Confirm every on-chain send after simulation preview.
- Never deliver redemption codes via voice/TTS.

## vs Base MCP

Base MCP proxies Bitrefill HTTP + x402 buyer. Phantom signs only — higher orchestration burden. Prefer Base MCP for pay when both available.

**User hears:** "Approve in your wallet" / "Approve the payment" — never "evm_sign" or "SIWX"
