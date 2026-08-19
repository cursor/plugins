---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
metadata:
  pstack-explicit-invocation: "true"
---

**Activation boundary:** execute this skill only when the user or another active pstack skill explicitly routes here.

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

## When to invoke

- The user said "reflect" or "/reflect".
- A complex task (5+ tool calls) just landed cleanly and the recipe is worth keeping.
- The agent hit dead ends, found the working path, and the path generalizes.
- The user corrected the agent's approach mid-task.
- A non-trivial workflow emerged that isn't captured anywhere.

Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the active transcript

The parent locates its transcript through host-provided session context before fanning out. Use only the active workspace's transcript root. If the host exposes no transcript path, write a tight digest of the session and pass that instead. Never scan sibling workspaces or global conversation stores; that crosses privacy boundaries.

List only recent JSONL candidates under that root, including flat, nested, and child-session layouts.

Three transcript layouts: legacy flat (`<id>.jsonl`), current nested (`<id>/<id>.jsonl`), and subagent (`<parent>/subagents/<child>.jsonl`).

For each candidate, read the first JSONL line and check that `message.content[0].text` contains the conversation's opening user prompt. Take the matching path. If no path resolves, write a tight digest of the session and pass that instead.

### 2. Run three reviewers in parallel

Launch three delegates concurrently through the host's native delegation feature. Use confirmed mappings from `~/.config/pstack/models.md` when present; otherwise inherit the parent model. Grant each only the connector and read capabilities needed for context lookups. The prompt forbids file writes; the parent applies edits. If concurrent delegation is unavailable, run the three lenses sequentially and keep their outputs separate. If delegation is unavailable entirely, the parent applies each lens in separate passes and reports that review independence was unavailable.

| Lens | Configuration role | Prompt template |
|---|---|---|
| Judgment | `reflect judgment` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `references/tooling-reviewer.md` |
| Divergent | `reflect divergent` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings through the host's normal delegate result channel.

### 3. Synthesize

Launch one synthesizer delegate using the confirmed `reflect synthesizer` mapping when present; otherwise inherit the parent model. Grant only the connector and read capabilities needed to spot-verify citations, and forbid file writes. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. If delegation is unavailable, the parent performs the same synthesis. The result is a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog. The synthesizer already applies this criterion; this is a final pass before edits land. See the **encode-lessons-in-structure** principle skill.

### 5. Apply

Before applying any Accepted edit, present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings. Skill changes affect every future agent in the org; do not auto-apply.

Backlog items file to whatever devex / backlog tracker your team uses automatically. Those are tracker submissions, not skill edits. Only the Accepted list waits for approval.

For each approved Accepted item, follow the Routing field exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): use an installed skill-authoring workflow and run its draft / test / iterate loop. If none is installed, follow the Agent Skills specification and available validator directly.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): use the same authoring workflow and run its description-optimization loop.
- `new skill: <kebab-name>`: use the same authoring workflow. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done. Skip this step if it doesn't.

### 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
