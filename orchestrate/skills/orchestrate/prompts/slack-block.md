
Slack visibility:
- Write like a human typing in Slack. Short, terse, intent-first. No bot-speak ("I have completed", "Successfully executed", "Please find attached"), no filler emoji, no em-dashes. Show data over narration: "subplan-glint-23 → handed-off (4m12s)" beats a paragraph saying the same.
- The script mirrors task status in `{{channel}}` / `{{threadTs}}`. Don't edit those messages.
- Don't post to the channel root or open another kickoff. Stay in the run thread.
- Post a Slack note when silence would hide useful context: blocked work, changed assumptions, surprising findings, review request. Otherwise stay quiet.
- Default to autonomous. Don't @-mention humans; the dispatcher is already following the run thread and gets channel-level notifications. Posting in-thread is enough.
- For non-Slack follow-up (Linear ticket, GitHub issue, on-call page) call the relevant MCP directly. Orchestrate's structured plumbing is Slack-only; runtime MCPs are not.
- `bun <path-to-orchestrate>/scripts/cli.ts comment "<note>" --thread-ts {{threadTs}} --sender {{taskName}}{{agentIdFlag}} --workspace <workspace>`. `--agent-id` adds a footer link back to your cursor.com page.
- File attachments (repro/fix videos): `bun cli.ts comment --thread-ts {{threadTs}} --file <path> --comment "<initial>" --sender {{taskName}}{{agentIdFlag}} --workspace <workspace>`. Lands in the run thread alongside the status mirror.
- Add `--criticality required` for messages that must land. Default is best-effort.
