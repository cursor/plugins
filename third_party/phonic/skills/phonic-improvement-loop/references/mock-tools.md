# Mock tool simulations

For scenarios sensitive to tool results, build a mock tool server or a local fixture generator with configurable outcomes. For example, simulate A at 40%, B at 30%, C at 25%, and D at 5%. These are example weights, not defaults. Match real response schemas, include relevant error or empty-result cases, and keep business side effects simulated.

For Responses, the test harness obtains an output from the mock and appends the matching `tool_call_output` to the history before generating the next turn. The Responses endpoint does not call the mock server for you. Replay uses recorded context; use Responses when changing historical tool outputs. To test an actual tool integration, connect the mock server to a dedicated test agent using the documented tool interface.

Reuse a recorded output schedule or seeded fixtures for baseline and candidate comparisons. A random sample of 100 runs will not necessarily contain exactly 40/30/25/5 outcomes; use fixed counts when exact coverage matters and random sampling when testing the distribution matters. Report observed counts and agent success by outcome, including rare failures that aggregate success can hide.
