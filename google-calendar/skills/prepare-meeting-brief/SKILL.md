---
name: prepare-meeting-brief
description: Generate an actionable meeting brief from upcoming Calendar events with relevant Gmail threads and Drive docs.
---

# Prepare meeting brief

## Trigger

Use when a user wants concise prep packets for upcoming meetings, including context, open questions, and linked artifacts.

## Required inputs

- Calendar ID and date window
- Meeting selection rules (all, by attendees, by title pattern, or by priority)
- Preferred brief format (short bullets or full structured brief)
- Optional destination for saved brief (Drive doc/folder)

## Workflow

1. Fetch upcoming Calendar events in the selected window.
2. For each selected event, gather linked artifacts from event description and attachments.
3. Search related Gmail threads by participants, subject, and recency.
4. Summarize context into sections: objective, decisions pending, risks, and prep checklist.
5. Optionally create/update a Drive document containing the brief.
6. Return a per-meeting summary with links and unresolved items.

## Tooling

- Prefer `gws mcp -s calendar,drive,gmail -w -e`.
- Optional upstream skills:
  - `npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-calendar`
  - `npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-drive`
  - `npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-gmail`

## Guardrails

- Do not include sensitive email content beyond what is required for meeting prep.
- Respect attendee privacy; avoid sharing private threads across unrelated meetings.
- Keep summaries factual and reference source links for key claims.
- Confirm before writing briefs to shared folders.

## Output

- Meeting brief(s) with objective, context, and action items
- Source links (Calendar event, Gmail threads, Drive docs)
- Open questions requiring user input
