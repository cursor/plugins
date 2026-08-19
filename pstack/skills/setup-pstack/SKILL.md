---
name: setup-pstack
description: Configure optional per-role model mappings for pstack. Detects models the current host confirms and writes a portable user configuration. Use for /setup-pstack, "configure pstack models", or changing pstack's model choices.
---

# Setup pstack

Write `~/.config/pstack/models.md`, the optional per-role model map used by pstack skills. Missing roles inherit the parent model. The configuration never determines whether a skill can run.

## Steps

### 1. Detect available models

Use the current host's model inventory or delegation capability when it exposes confirmed identifiers. If the host provides no inventory, offer only `inherit-parent` and ask the user to paste any identifiers they have already verified. Never infer or invent an identifier.

If the host cannot select a model for delegated work, explain that every role will inherit the parent model and still write a valid configuration only when the user wants one.

### 2. Load current state

Read `~/.config/pstack/models.md` when present. Otherwise start with `inherit-parent` for every role.

### 3. Map and confirm

Show every role with its current value. Mark any real identifier absent from the confirmed inventory as stale. Prefer the host's structured-question feature; if unavailable, ask one concise chat question with numbered options.

Panel roles accept a comma-separated list, with one independent delegate per entry. `arena cross-judge pool` is also a list; Arena chooses a different confirmed model family from the parent when possible. Repeated `inherit-parent` entries request independent runs on the parent model and must not be described as model diversity.

### 4. Validate

Every real identifier written must be in the host-confirmed inventory. `inherit-parent` is always valid. If an identifier is unavailable, stop and ask for a confirmed replacement or use `inherit-parent`. A stale identifier must never break delegation.

### 5. Write the configuration

Create the parent directory when needed. Overwrite the whole file so reruns stay idempotent. Use this shape:

```markdown
# pstack model configuration

# Missing roles and `inherit-parent` run on the parent chat model.
feature, refactoring: inherit-parent
bug-fix: inherit-parent
perf-issue: inherit-parent
hillclimb: inherit-parent
judgment and prose: inherit-parent
hardest tasks: inherit-parent
how explorer: inherit-parent
how explainer: inherit-parent
how critics: inherit-parent, inherit-parent, inherit-parent, inherit-parent
why investigators: inherit-parent
why synthesizer: inherit-parent
reflect tooling: inherit-parent
reflect judgment: inherit-parent
reflect divergent: inherit-parent
reflect synthesizer: inherit-parent
arena runners: inherit-parent, inherit-parent, inherit-parent, inherit-parent
arena cross-judge pool: inherit-parent
swarm workers: inherit-parent
architect runners: inherit-parent, inherit-parent
interrogate reviewers: inherit-parent, inherit-parent, inherit-parent, inherit-parent
```

### 6. Confirm

Tell the user which path was written, which roles use confirmed model identifiers, and which inherit the parent. The file applies to new pstack runs in every host that can read it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof, such as a `verify-*` skill or existing harness. If not, offer once: "Want a project-local verification skill, so agents can drive the app the way a user does and prove changes work?" On yes, invoke **create-verification-skill**. On no, move on.
