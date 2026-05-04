
### Andon
Halts new spawns across the whole tree. Raise only with concrete evidence that continued spawning produces garbage: upstream output is wrong and downstream tasks will fail against it, verifier cascade shows acceptance was wrong, auth or infra is unrecoverable. A task hitting its own snag is a `Status: blocked` handoff, not Andon.

  bun <path-to-orchestrate>/scripts/cli.ts andon raise --reason "<why>"{{agentIdFlag}} --workspace <workspace>

`--reason` is required and posts to the run thread so the tree can see why orchestration paused. The reaction is the cheap gate children poll. `--agent-id` adds a footer link back to the agent that raised it.
