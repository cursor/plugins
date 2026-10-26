# Wallet: Base MCP

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

Base MCP (`https://mcp.base.org`) — wallet ops + **proxied HTTP** to allowlisted partners. Bitrefill hybrid plugin allowlists **`api.bitrefill.com` only** — not `docs.bitrefill.com`.

Pair with [../touchpoints/x402.md](../touchpoints/x402.md) (Path 1/2) or Bitrefill MCP invoice pay. Sign-in → [siwx.md](siwx.md).

## Tool split

| Tool | Proxied / remote | Wallet action |
|------|------------------|---------------|
| `web_request` | **Server proxies HTTP** to allowlisted hosts incl. `api.bitrefill.com` | No signing |
| `get_wallets`, `get_portfolio` | Remote read | No |
| `sign` | Remote orchestration | **User approves in Base Account** |
| `send`, `swap`, `send_calls` | Remote orchestration | **User approves each tx** |
| `initiate_x402_request` / `complete_x402_request` | **Server handles x402 handshake** | **User approves each payment** |
| `chain_rpc_request` | Server RPC proxy | No |

## Bitrefill submission table

| Bitrefill step | Base MCP tool | User-facing |
| --- | --- | --- |
| Catalog / browse | `web_request` | *(silent — or "Searching…")* |
| Wallet sign-in / codes | `get_wallets`, `sign` | "Sign in with your Base wallet once" |
| Pay order | x402 tools | "Approve the payment in your Base Account" |
| Direct USDC (no x402) | `send` | "Approve the USDC transfer in your Base Account" |

All writes need Base Account approval. Poll `get_request_status(requestId)` after approval.

## USDC on Base (x402)

| Field | Value |
| --- | --- |
| Network (CAIP-2) | `eip155:8453` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| payTo | `0x480CD46E6faDe651a0437DeaddA53D5c8e7D846A` |

x402 buyer supports **Base and Base-Sepolia only**.

## x402 workflow

1. **Approve payment** — `initiate_x402_request(url, method, maxPayment)` → user approves in Base Account. *(say: "Approve the payment in your Base Account" — tool title: "Approve USDC payment")*
2. User approves in Base Account
3. `complete_x402_request(requestId)` → paid response body. *(silent — poll delivery)*

Micro-fees: `maxPayment: "0.01"`. Invoice pay: slightly above `price_usd`.

## Headers

- **`X-Access-Token`**: raw JWT from connect — **not** `Authorization` (Base MCP strips `Authorization`).
- **`sign-in-with-x`**: base64 decomposed SIWX payload — [siwx.md](siwx.md).

## Smoke-tested (Cursor)

- `web_request` → `api.bitrefill.com/x402/*` returns 402 + x402 envelope
- `web_request` → `docs.bitrefill.com` **rejected** (not allowlisted)
- `initiate_x402_request` → Base Account approval URL

## Source of truth

- [Base MCP x402 guide](https://docs.base.org/ai-agents/guides/x402-payments)
- [Base Bitrefill plugin](https://github.com/base/skills/blob/master/skills/base-mcp/plugins/bitrefill.md)

**User hears:** "Sign in with your Base wallet once" → "Approve the payment in your Base Account" → "Your code is ready."
