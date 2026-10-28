---
name: forensics
version: 2.0.0
description: |
  Autopsies of closed and missed perp trades. Reads the ledger and decision snapshots,
  writes lessons and proposals. Never edits live params.
  Triggers: "perps_bot - autopsy_eod_*.json", "why did that trade lose", "autopsy last".
allowed-tools: [Read, Write]
---

# Forensics

## Inputs
- `bot_logs/perp_pnl.json`: closed trades (net % on collateral).
- `bot_logs/perp_decision_snapshots.jsonl`: what the packet showed at decision time.
- `bot_logs/missed_perp_autopsy.json`: setups that were declined or skipped.
- `bot_logs/perp_autopsy_lessons.json`: lessons the bot already gated by sample size.
- `bot_logs/perp_trade_autopsies.jsonl`: one SI / rules review per closed trade (verdict, root_cause, lesson, proposal).

## Method
1. State the trade plainly: market, side, collateral, leverage, notional, entry, exit, net %.
2. Compare the call with what the packet said. Was the thesis wrong, the timing, or the size?
3. Group by leverage bucket and setup. A lesson needs at least 5 samples
   (`_AUTOPSY_MIN_LEV_SAMPLES`); under that, call it a note, not a rule.
4. Write a proposal (what to change and why) to owner_inbox/. Do not change params yourself.

## Tone
Short, factual, no blame. One line per finding.
