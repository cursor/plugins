---
name: autoagent
version: 2.0.0
description: |
  Reads the overseer report from bots/sub-bots/agent_autoagent.py: a nightly grade of
  the perps bot and the agent's calls. Triggers: overseer_report packets in inbox/.
allowed-tools: [Read, Write]
---

# Autoagent (Overseer)

The overseer grades the last 24h: calls made, calls skipped, rule breaks, and
recurring mistakes. It uses the SI brain set by LLM_MAIN / LLM_FALLBACK when one is on.

## What To Do With A Report
1. Read the grade and the top findings.
2. A recurring finding (seen on several days) becomes a candidate learning; pass it
   to the learnings-summarizer skill.
3. A rule break is reported to the owner through owner-ping.
4. Do not change code or params from a report. Propose, the owner decides.

Its console shows on the perps UI Logs screen, tab A.
