---
name: pnl-tracker
version: 2.0.0
description: |
  Realized and unrealized perps PnL, fees and funding.
  Triggers: "how am I doing", "PnL", "scoreboard", the perps UI dashboard.
allowed-tools: [Read]
---

# PnL Tracker

## Sources
- Realized: `bot_logs/perp_pnl.json` (written by `record_pnl`). Net of fees, % on collateral.
- Open: `bot_logs/perp_positions.json` plus the live price for unrealized.
- Wallet: `bot_logs/wallet_balance.json`.

## Rules
- Always say collateral and notional apart. "Up 20%" means 20% on collateral.
- Report net, after fees. Show funding separately when it is large.
- A PnL reset (perps UI, Dashboard, R) archives the ledger and starts a fresh one.
  Archives (A) stay readable. Old numbers are never deleted.

## Format
`SOL-PERP long 50x | collateral $40 | notional $2,000 | net +$6.10 (+15.3%)`
