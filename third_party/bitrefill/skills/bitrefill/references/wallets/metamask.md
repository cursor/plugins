# Wallet: MetaMask

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

**No official MetaMask-branded payment MCP** for agent commerce. Don't confuse with Embedded Wallets MCP (`https://mcp.web3auth.io`) — **docs/SDK help only**, not signing wallet.

## Surfaces

| Surface | Link | Role for Bitrefill |
| --- | --- | --- |
| **MetaMask Agent Wallet (official)** | [docs.metamask.io/agent-wallet](https://docs.metamask.io/agent-wallet/) | `mm` CLI + agent skills |
| Product / Early Access | [metamask.io/agent-wallet](https://metamask.io/agent-wallet) | Guard/Beast modes, spending limits |
| Architecture | [docs.metamask.io/agent-wallet/reference/architecture](https://docs.metamask.io/agent-wallet/reference/architecture/) | Server-wallet TEE; `pollingId` + MFA |
| **Community MetaMask MCP** | [github.com/Xiawpohr/metamask-mcp](https://github.com/Xiawpohr/metamask-mcp) | Browser extension via QR — not autonomous |
| Embedded Wallets MCP | [docs.metamask.io/embedded-wallets/build-with-ai](https://docs.metamask.io/embedded-wallets/build-with-ai/) | **Exclude** from wallet matrix |

## Capabilities (mm CLI)

| Capability | MetaMask mm |
| --- | --- |
| HTTP proxy | **None** — agent orchestrates HTTP |
| x402 | Skill-guided EIP-3009 via `mm wallet sign-typed-data` |
| SIWX | `mm wallet sign-message` |
| HITL | **Confirm every payment**; 2FA on policy violations |
| Base USDC | Yes (multi-EVM) |

## Bitrefill pairing

1. Agent creates invoice via Bitrefill MCP / CLI / x402 REST (HTTP from harness).
2. Pay: parse x402 402 → build EIP-3009 typed data → `mm wallet sign-typed-data` → user confirms → agent retries HTTP.

Rank **#5–6** in [matrix.md](matrix.md) — not recommended for autonomous checkout.

## Hosts

Codex, Claude Code, OpenClaw, Hermes, Cursor (shell + mm installed).

## vs Base MCP / AgentCash

MetaMask = manual payment confirm per x402. Prefer Base MCP x402 or AgentCash for agent-commerce.

**User hears:** "Approve the payment in your wallet" — never "mm CLI" or tool names
