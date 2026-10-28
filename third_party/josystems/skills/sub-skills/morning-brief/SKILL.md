---
name: morning-brief
version: 2.0.0
description: |
  The daily perps brief to the owner. The bot fires it once a day
  (fire_perps_morning_brief, state in bot_logs/perps_morning_state.json).
allowed-tools: [Read, Write]
---

# Morning Brief

## Contents (keep it under 15 lines)
1. Open positions: market, side, collateral, leverage, notional, net %, distance to liq.
2. Yesterday: closed trades and net PnL.
3. Bias for today per chain (SOL / BTC / ETH) and the one reason.
4. Flow read: `flow.cycle` phase/score, `flow.live_call`, the editorial thesis, and the live
   Kalshi `p_up` per chain. Say each lane's age; write "stale" if flagged.
5. Anything blocked or broken (warden, heartbeat).

Send it with the owner-ping skill.
