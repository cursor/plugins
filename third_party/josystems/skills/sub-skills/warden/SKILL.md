---
name: warden
version: 2.0.0
description: |
  Reads packets from bots/sub-bots/security_warden.py: wallet anomalies, file
  integrity, bot liveness and crashes. Triggers: warden packets in inbox/.
allowed-tools: [Read, Write]
---

# Warden

security_warden watches heartbeats in `bot_logs/` (for the perps bot,
`perps_bot_heartbeat.json`), wallet balance changes and file integrity.
It does not trade and does not restart anything.

## On A Packet
- Wallet anomaly: tell the owner now via owner-ping. Do not fire new trades until cleared.
- Bot stale or crashed: tell the owner. Restarts are the owner's job.
- Integrity change: note the file and the change, propose a check.

Its console shows on the perps UI Logs screen, tab W.
