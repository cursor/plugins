---
name: tempo-payments
description: Integrate Tempo stablecoin payments (send/accept), TransferWithMemo reconciliation, and optional fee sponsorship in TypeScript/Node apps.
---

# Tempo Payments (TypeScript/Node)

## Use these docs (Tempo)

- Payments overview: `https://docs.tempo.xyz/guide/payments/`
- Send a payment: `https://docs.tempo.xyz/guide/payments/send-a-payment/`
- Accept + verify payments: `https://docs.tempo.xyz/guide/payments/accept-a-payment/`
- Transfer memos (TransferWithMemo): `https://docs.tempo.xyz/guide/payments/transfer-memos/`
- Sponsor user fees: `https://docs.tempo.xyz/guide/payments/sponsor-user-fees/`
- Pay fees in any stablecoin: `https://docs.tempo.xyz/guide/payments/pay-fees-in-any-stablecoin/`

## Tempo Wallet (agent setup)

- Tempo Wallet skill: `https://tempo.xyz/SKILL.md`

## MPP (Machine Payments Protocol)

If what you’re building is **paid API access** (HTTP `402` flows) rather than “send a transfer to an address”, use Tempo’s MPP docs:

- Tempo MPP overview: `https://docs.tempo.xyz/guide/machine-payments/`

If you’re exposing a paid **MCP tool/server**, the MPP MCP transport spec is here:

- MPP MCP transport: `https://mpp.dev/protocol/transports/mcp`

## What to build in a “payments” section

### Payment intent (server)

Create a stable interface your UI can render and your backend can reconcile:
- token address
- recipient address
- amount (base units)
- memo / invoice id (prefer bytes32-compatible)
- expiry (optional)

### Accept & reconcile (server)

Mark an invoice paid only after verifying onchain:
- correct TIP-20 token
- correct `to` address
- correct amount (exact or \(\ge\) expected, depending on your policy)
- correct memo (via `TransferWithMemo` when used)
- finality rules per Tempo docs

### Client integration

Use Viem/Wagmi + Tempo guides to:
- connect wallet/account
- send TIP-20 transfer (with memo when you need reconciliation)
- show receipt / paid state

### Fee UX (optional)

Choose one:
- let users pay fees in stablecoins (no gas token)
- sponsor fees (fee payer service) for gasless UX

## Guardrails

- Do not put secrets (emails, PII, API keys) in memos; memos are public.
- Keep memo format deterministic and idempotent (e.g. `invoice:<id>` hashed to bytes32).
- Do not hardcode RPC URLs/chain IDs in code unless Tempo docs recommend it; keep config per env.

