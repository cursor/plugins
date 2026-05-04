<!-- orchestrate finished-no-handoff
task: {{taskName}}
branch: {{branch}}
agentId: {{agentId}}
runId: {{runId}}
resultStatus: {{resultStatus}}
terminatedAt: {{terminatedAt}}
-->

# {{taskName}} finished without handoff

Status: {{resultStatus}} (cloud agent ended cleanly but never wrote a `## Status` handoff)
Cloud agent: {{agentId}}
Run: {{runId}}
Branch: {{branch}}
Terminated: {{terminatedAt}}

## Suggested next steps
- Inspect the raw handoff at `handoffs/{{taskName}}.md` to see what the worker actually emitted.
- Retry as-is if this looks like a prompt-misfire (worker produced prose but not the structured template).
- Abandon: skip task, replan around it if the goal genuinely has no acceptable output.{{rawSnippetBlock}}
