# Wallet Matrix

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

Wallet × capability × Bitrefill touchpoint. Ordered by **autonomous purchase feasibility** (lowest HITL first).

## Ranking

| Rank | Wallet | HTTP proxy | x402 | SIWX | Autonomous | Best touchpoint |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Bitrefill balance** | via MCP/CLI | N/A | N/A | **High** (pre-fund) | Bitrefill MCP / signed-in CLI |
| 2 | **AgentCash** | `fetch` (local) | **Auto** | **Auto** | **Highest** | x402 REST, `x402_payment_url` |
| 3 | **CDP awal** | via x402 pay | **Auto under caps** | Manual | **High** | x402 REST, `x402_payment_url` |
| 4 | **Base MCP** | `web_request` | Approve each | `sign` approve each | Partial | x402 Path 1, MCP invoice |
| 5 | **MetaMask mm CLI** | None | Skill + confirm | Manual | Low | MCP/CLI + manual loop |
| 6 | **Community MetaMask MCP** | None | Manual | Manual | Low | Not recommended |
| 7 | **Phantom MCP** | None | Manual loop | `evm_sign` | Low | Sign-only; pair with Base/Bitrefill MCP |

## Pairing rules

- **Bitrefill MCP OAuth'd** → catalog/checkout on MCP; pay balance first, then Base MCP x402 on `x402_payment_url`.
- **Base MCP only** → x402 REST Path 1 ([../touchpoints/x402.md](../touchpoints/x402.md)).
- **Phantom + Base MCP** → Base MCP HTTP; Phantom SIWX if Phantom is payer ([phantom.md](phantom.md)).
- **No wallet** → payment_link / human only.

## Base USDC constants

| Field | Value |
| --- | --- |
| Network | `eip155:8453` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| payTo | `0x480CD46E6faDe651a0437DeaddA53D5c8e7D846A` |

## Avoid autonomous agents

- x402 REST **Path 2** (approval per $0.001–0.002 call)
- MetaMask / Phantom for x402-heavy flows
- Payment links without wallet automation

Pay-time tree → [payment.md](payment.md). Harness routing → [../harnesses/decision-engine.md](../harnesses/decision-engine.md).

**User hears:** never wallet ranks or HITL scores — only "Sign in with your wallet once" and "Approve the payment."
