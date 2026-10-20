---
name: principle-context-discipline
description: "Apply when context fills up: bulk reading, long files, repeated reads, fan-out planning. Route bulk to subagents and keep the main thread for decisions and summaries. Context is the scarcest resource on a 27B-class model."
disable-model-invocation: true
---

# Context Discipline

Keep the main-thread context for decisions and the work you do yourself. Route bulk reading and exploration to subagents, and bring back a summary, not the raw payload.

**Why:** Context is the binding constraint on a 27B-class model. The same token that could hold the decision you are making is consumed by a file you only needed to grep. On-prem, the cost of a bloated main thread is not a fee — it is degraded reasoning on the part of the model that is coordinating the run.

How to apply:

- **Bulk to subagents.** Reading many files, searching the repo, or exploring a subsystem goes to an `onprem-agent` subagent. Never `generalPurpose`: it skips the mode read and the role mapping (see onprem-mode's Subagents section). The subagent's context absorbs the volume.
- **Summaries, not payloads.** What returns to the main thread is the finding, the list of matches, the conclusion. Not the file contents, not the full transcript.
- **File pointers, not inline context.** When a subagent needs an artifact, give it the path and have it read the file. Do not paste the file into the brief.
- **Plan fan-out in the main thread, execute it out of it.** The coordination decision — what to spawn, on which model, with what scope — belongs in the main thread. The spawning does not need to be narrated back.

A main thread that has accumulated raw exploration output is doing the subagent's job at the wrong altitude. The tell is a long context where the recent turns are mostly reading, and the actual decision is buried.
