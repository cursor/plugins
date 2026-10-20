---
name: principle-no-fallback-to-banned
description: "Apply when a subagent spawn fails, times out, or is rejected. Retry on a different allowlisted model, or stop and report. Never degrade to a banned model. Availability is not a reason to cross the ban."
disable-model-invocation: true
---

# No Fallback to Banned

When a spawn fails, the fix is another allowlisted model or a stop. It is never a banned one.

**Why:** This is the moment the lock is most likely to break. A failing spawn pressures the agent toward whatever works, and a frontier model that is available will work. The ban is strongest exactly here: the temptation to "just try the other one" is real, and the on-prem property of the run depends on refusing it.

On a failed, timed-out, or rejected spawn:

1. Do not retry the same model unchanged if it failed for a reason a retry won't fix.
2. Re-spawn on a **different allowlisted** model for the same role. The `onprem-mode` **spawn-retry** playbook caps retries and names each attempt.
3. If no allowlisted model works, stop and tell the user: what was tried, what failed, and that nothing allowlisted succeeded.

Never:

- Reach for a Claude, Gemini, Grok, or GPT slug because an on-prem model is unavailable or erroring.
- Treat "the on-prem model timed out" as license to finish the task on a frontier model.
- Present a banned model as the recovery option in a question to the user.

A degraded finish on a banned model is a failed lock, reported as such — not a success with a footnote.
