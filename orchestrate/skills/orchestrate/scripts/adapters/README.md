# Adapters

Adapters are external IO shells. They do not own orchestration state.

## SlackAdapter

`SlackAdapter` is the only adapter orchestrate ships. Slack is the human-visibility layer:

- post the run kickoff message
- post or edit one task message per task in the kickoff thread
- upload files when an operator explicitly asks
- read reactions for Andon
- post free-form comments in the run thread

`postRunKickoff` is the only adapter method that writes to the channel root. The CLI resolves the channel once, then constructs the adapter with that channel. Every later Slack write takes a `threadTs` and stays in the same run thread.

Orchestrate owns Slack status mirrors, Andon, and the comment retry queue. Agents can still call MCPs directly for Linear, GitHub, Slack, Notion, and other ad-hoc external work. Those systems are not adapter destinations.

## Comment retry queue

`comment-retry-queue.json` stores required comments by destination string. The valid Slack shape is `slack:<channel>:<thread_ts>`. Workspace calls validate the destination against `plan.slackKickoffRef` before posting or draining.

Routine lifecycle mirrors are best effort. Required comments retry with the queue's backoff schedule.
