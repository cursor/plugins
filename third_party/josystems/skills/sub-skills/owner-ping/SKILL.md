---
name: owner-ping
version: 2.0.0
description: |
  How the agent notifies the owner. Use it for every owner-facing message:
  opens, closes, declines, alerts and briefs. Triggers: any need to tell the owner.
allowed-tools: [Read, Write]
---

# Owner Ping

## Channels
- File: write a JSON note to `owner_inbox/` (always). Name it
  `<bot> - <kind>_<YYYYMMDD_HHMMSS>.json`, for example `perps_bot - alert_20261016_093000.json`.
- Telegram: if `TELEGRAM_TOKEN` and `TELEGRAM_CHAT_ID` are set in `bots/.env`.

## Message Rules
- One line headline, then at most 5 lines.
- Say collateral, leverage and notional apart on any trade message.
- Times in the owner's local zone with a label.
- Never include keys, tokens, or wallet secrets.
- Urgent (liq risk, crash, wallet anomaly): send now. Everything else can wait for the brief.
