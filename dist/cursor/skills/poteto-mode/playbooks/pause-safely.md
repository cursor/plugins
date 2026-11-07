---
description: "Pause safely"
---

### Pause safely

Read [the shared policy](../../../docs/core.md) and the current client adapter first. Its scope gates, model routing, worker limits, and required-capability rules govern this playbook. Personal-style cleanup and external integrations are optional; historical large-fan-out recipes require explicit approval.

**You own a clean stop. Leave a checkpoint a cold-start agent can resume from.** This is explicit only. On "keep going", "going to bed, keep going", or "don't stop", do not pause.

1. Stop at a safe boundary. Finish the current atomic step or back out of it. Start nothing new, and cancel any nested subagents.
2. Take no irreversible action to pause. No PR, push, or commit without explicit authorization, even if an earlier PR exists.
3. Preserve uncommitted edits on disk. Report dirty/broken state honestly. Use the repository's commit convention only when a checkpoint commit is separately approved; never include unrelated edits.
4. Capture intent, progress, verified commands, current state, next steps, key files, and gotchas in the host's session storage or an explicitly approved note. Otherwise return the capsule in chat. Do not write into installed plugin content. If a decision trail exists, point at it instead of duplicating it.

**Reply:** where you are in the loop, what's on disk versus still in your head (paths, no diff dumps), the commits you made and whether the tree is clean, and the first action on resume. This is a pause, not a final report.
