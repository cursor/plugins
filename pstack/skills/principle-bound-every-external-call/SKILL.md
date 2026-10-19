---
name: principle-bound-every-external-call
description: "Apply when code calls something it does not control: a network service, a database, a queue, a third-party API, or a subprocess. Give every call a deadline, retry only what is safe to retry, park messages that keep failing, and stop calling a dependency that is down."
disable-model-invocation: true
---

# Bound Every External Call

Every call to a dependency you do not control can hang, fail, or succeed slowly. Decide what the code does in each case before you write the call, and make each answer a bound the code enforces.

**Why:** An unbounded call turns one slow dependency into an outage everywhere it is called. A call with no deadline holds a thread or a connection until something else times out. A naive retry multiplies the load on a dependency that is already failing. A message that always fails blocks the queue behind it or disappears.

**The idea:** give each external call four bounds.

1. **A deadline.** Set an explicit timeout on every call, shorter than the budget of whoever waits on it. A library default is not a decision. Pass the remaining budget down so an inner call cannot outlive its caller.
2. **A retry policy.** Retry only errors that can be transient, such as timeouts, throttling, and 5xx responses, and only operations that are safe to repeat (see **make-operations-idempotent**). Use exponential backoff with jitter and a cap on attempts. Retry at one layer only. Retries stacked at several layers multiply into a retry storm.
3. **A place for poison messages.** In async work, move a message that keeps failing to a dead-letter queue after the attempt cap, with enough context to replay it. Do not drop it, and do not let it block the messages behind it.
4. **A circuit breaker.** When a dependency fails repeatedly, stop calling it for a while and fail fast or degrade on purpose. Probe it before you send full traffic again.

Make each bound visible where the call is made, as named configuration or a typed client, not as library defaults that a reader cannot see.

**The test:**
1. What happens if the dependency never answers?
2. What happens if it fails for ten minutes, then recovers?
3. Is every retried operation safe to run twice?
4. Where does a message go after its last attempt, and how is it replayed?

Prove each answer with a test that uses a fake dependency that hangs, fails, and recovers, not with a comment. If an answer is "it waits" or "it retries forever," the call is missing a bound.
