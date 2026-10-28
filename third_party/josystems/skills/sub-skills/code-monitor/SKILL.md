---
name: code-monitor
version: 2.0.0
description: |
  Reads packets from bots/sub-bots/code_tuner.py: source changes, param drift and
  output health for the perps bot. code_tuner never writes code.
  Triggers: code_tuner packets in inbox/.
allowed-tools: [Read, Write]
---

# Code Monitor

code_tuner snapshots the bot's source, tracks which params changed
(`bot_logs/perps_param_changes.jsonl`) and checks that expected outputs keep updating.

## On A Packet
- Source changed: note what changed and whether behavior should differ.
- An output went stale: check the bot heartbeat (`bot_logs/perps_bot_heartbeat.json`).
- Param drift: compare with `rules/rules.md`. Report, do not revert.

Proposals go to owner_inbox/. Its log is on the perps UI Logs screen, tab T.
