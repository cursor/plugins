---
name: principle-verifiable-units
description: "Apply to multi-step work, migrations, sweeps, and long tasks on on-prem models. Break the work into small units that each end in a check, and verify each before the next. On-prem models drift on long undivided tasks."
disable-model-invocation: true
---

# Verifiable Units

On on-prem models, structure work as a sequence of small units, each ending in a check that passes before the next unit starts.

**Why:** A 27B-class model degrades over long undivided stretches: it loses the thread, accumulates unreported drift, and is more likely to claim a step that was not taken. The on-prem stack answers that with structure, not with a bigger model. A unit that ends in a check either passes and the next unit starts on solid ground, or fails and the drift is caught while it is local.

How to apply:

- Name the unit and its check before you start it. The check is the pass/fail condition for that unit, not for the whole task.
- Run the check (**deterministic-proof** where a script can do it). Do not start the next unit on a unit whose check you skipped or assumed.
- For a migration or sweep across many call sites, the unit is one call site or one file, and the check is that the slice still builds and behaves.
- Order units so the sequence proves itself: each check is evidence the previous unit was real. A reviewer reading the commit or PR sequence sees the proof in the order, not in a summary.

A long task with no intermediate checks is a single unit, and a single long unit on an on-prem model is where drift happens. If a step has no check, the step is not done-ready; add the check or split the step.
