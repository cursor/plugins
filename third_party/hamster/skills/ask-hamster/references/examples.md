# Examples

Pass these as the prompt to the Hamster MCP ask tool or `hamster chat`. Include local paths, branch, and diff in the same prompt when they help.

## Connect current work to priorities

I'm working on the webhook retry logic in apps/sync/src/modules/linear/. What are the team's priorities around this area, and is there an initiative tracking this work?

## Understand a blocker before coding

I'm about to start on the mobile checkout flow. What's blocking that initiative, and which part of the flow should I build first given those blockers?

## Pull blueprint context during implementation

I'm modifying the auth middleware in apps/web/app/api/. What does our blueprint say about the auth architecture for third-party integrations?

## Find related work before duplicating it

I'm about to add rate limiting to the webhook processor in apps/sync/. Would this duplicate or conflict with any brief, task, or decision already touching rate limiting or the webhook processor?

## Narrow a blocker to the current branch

Start a thread:

I'm working in apps/sync/src/modules/linear/. What's blocking the Linear sync initiative?

Then continue the same thread:

Which of those blockers can I unblock from the current branch?

Use the second form only when the follow-up relies on the first response.
