---
name: daily-inbox-triage
description: Run a repeatable Gmail triage routine, then schedule follow-ups in Calendar for actionable threads.
---

# Daily inbox triage

## Trigger

Use when a user asks to clean up inbox backlog, prioritize urgent mail, and convert important threads into calendar actions.

## Required inputs

- Mailbox user ID (typically `me`)
- Time window (for example, last 24h or last 7d)
- Priority criteria (sender domains, keywords, existing labels)
- Optional follow-up window for scheduling (for example, next 2 business days)

## Workflow

1. Confirm authentication is available (`gws auth login` if needed).
2. List candidate messages with a bounded query and page size.
3. Fetch full message metadata for the shortlisted message IDs.
4. Classify messages into: archive, needs reply, delegate, or schedule follow-up.
5. Apply Gmail label updates in batches.
6. For schedule follow-up items, create short Calendar events with links back to the message threads.
7. Produce a compact triage summary with counts and the highest priority unresolved threads.

## Tooling

- Prefer `gws mcp -s gmail,calendar -w -e` tools when MCP is available.
- Use direct CLI commands only when MCP access is not configured.
- If additional API-specific methods are needed, install upstream skills:
  - `npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-gmail`
  - `npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-calendar`

## Guardrails

- Never delete mail unless explicitly requested.
- Use narrow queries first; avoid full-mailbox scans by default.
- For label changes on more than 100 messages, confirm before applying.
- Include timezone when creating calendar follow-up events.

## Output

- Triage totals by action type
- List of created follow-up events
- Remaining high-priority threads needing user attention
