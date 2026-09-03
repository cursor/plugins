---
name: principle-prove-it-works
description: "Apply after completing a task, before declaring done. Verify against the real artifact (run the feature, read the actual value, inspect the diff), not a proxy, self-report, or 'it compiles.'"
disable-model-invocation: true
---

# Prove It Works

Verify every task output by checking the real thing directly. Do not infer from proxies, self-reports, or "it compiles."

A task is done only when its success criterion is observed on the real path.
Automated tests are supporting evidence, not a substitute for exercising the
feature.

**Why:** Unverified work has unknown correctness. Indirect verification (file mtimes, output freshness, agent self-reports, cached screenshots) feels cheaper than direct observation. Acting on a wrong inference costs far more than checking the source.

**Pattern:** After completing any task, ask: "how do I prove this actually works?"

Check the real thing, not a proxy:
- Check process liveness directly, not indirectly through derived state
- Read the actual value, not a cached or derived representation
- When verification fails, suspect the observation method before suspecting the system

Code and features:
1. Build it (necessary but not sufficient)
2. Run it and exercise the actual feature path
3. Check the full chain: does data flow from input to output?
4. For integrations, test the full communication path end-to-end

## Runtime proof

For every bug fix or integration change, produce a before-and-after proof record:

- `surface`: the exact user, API, CLI, worker, or provider entry point.
- `baseline`: the same input on the clean build and the observed failure.
- `patched`: the same input on the patched build and the expected result.
- `chain`: the final output and any external state that the path changes.
- `safety`: read-only, dry-run, isolated fixture, or disposable target.
- `evidence`: the command or actions, environment, run identifiers, timestamp,
  and observed result.

The baseline and patched runs use the same surface and input. A direct helper
call or a unit test is not a same-surface run. For an integration change, the
patched run crosses the changed provider or service seam. A lower-level probe
is partial evidence when the changed behavior sits in a workflow or queue.

For write-capable integrations, use a named sandbox, disposable target, or
provider dry-run. Never mutate customer data to obtain proof. If no safe target
exists, report `behavior-unverified` and do not declare the task done or ready
for review.

Delegation: trust artifacts, not self-reports.
When verifying delegated work, inspect the actual output artifact (git diff, file contents, runtime behavior), not the delegate's summary. Agents report what they intended, not always what happened.

## Script the check when you can

The strongest proof is a deterministic script that re-runs the same comparison, not a one-time eyeball. Write the script, run it, and keep its output as an artifact a reviewer can re-run instead of trusting your word. A script comparing the old and new compiled output catches what a glance misses.

Keep the artifact visible for the human. Commit it only for large or complex work where the trail has to be auditable later, like a big port or migration (the **show-me-your-work** skill). Most work just needs it visible, not committed.
