<!-- pstack-routing:start -->
## pstack model routing

Use these aliases for pstack delegation. Pin `reasoning_effort: "xhigh"` and
`fork_turns: "none"` whenever a model is specified directly.

- Spark (`gpt-5.3-codex-spark`): bounded micro-edits.
- Luna (`gpt-5.6-luna`): high-volume search, extraction, live verification,
  and repetitive work.
- Terra (`gpt-5.6-terra`): everyday features, refactors, ordinary bugs, and
  reviews.
- Sol (`gpt-5.6-sol`): architecture, complex bugs, performance,
  hill-climbing, synthesis, and judging.
- Panels use Spark, Luna, Terra, and Sol. Start the Sol cross-judge only after
  every candidate output is complete.
- Use native `spawn_agent`, `wait_agent`, and `followup_task`; do not invent
  background, resume, or cloud-agent semantics.
<!-- pstack-routing:end -->
