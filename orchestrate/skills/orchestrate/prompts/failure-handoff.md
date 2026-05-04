<!-- orchestrate failure handoff
task: {{taskName}}
branch: {{branch}}
agentId: {{agentId}}
runId: {{runId}}
failureMode: {{failureMode}}
terminatedAt: {{terminatedAt}}
-->

# {{taskName}} failure handoff

Status: error (cloud agent terminated without writing a handoff)
Failure mode: {{failureMode}}
Cloud agent: {{agentId}}
Started: {{startedAt}}
Terminated: {{terminatedAt}}
Duration: {{duration}}
Last activity: {{lastActivityLine}}
Last tool call: {{lastToolCall}}
Branch: {{branch}}
SDK error: {{sdkError}}

## Suggested next steps
{{suggestions}}
