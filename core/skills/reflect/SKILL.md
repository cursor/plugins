---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

## When to invoke

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the active transcript

The parent finds its own transcript file before fanning out. The system prompt names the active workspace's `agent-transcripts/` directory. Use that path. Never glob across the host's other workspaces. That crosses workspace boundaries and reads private chats from unrelated projects.

```bash
ls -t <agent-transcripts>/*.jsonl <agent-transcripts>/*/*.jsonl <agent-transcripts>/*/subagents/*.jsonl 2>/dev/null | head -10
```

Three transcript layouts: legacy flat (`<id>.jsonl`), current nested (`<id>/<id>.jsonl`), and subagent (`<parent>/subagents/<child>.jsonl`).

For each candidate, read the first JSONL line and check that `message.content[0].text` contains the conversation's opening user prompt. Take the matching path. If no path resolves, write a tight digest of the session and pass that instead.

### 2. Spawn three reviewers in parallel

One message, three delegate calls, the default delegate role, with `model` set as below, `access: read`. The reviewer may call tools, including MCP tools, for context lookups (tickets, chat threads, observability traces named in the transcript). It must not write. If this host's read-only mode also removes tool servers, run it in write mode with an explicit "do not modify any file" line instead, per `runtime/delegation.md`.

Resolve each delegate's role through `.pstack/models.md` and `runtime/roles.md`. A missing role line uses its class default. `auto`, `inherit-parent`, and `inherit` leave the model and effort unset. If the host rejects a configured model, use a confirmed available class default and report the substitution. When the host supports model families, prefer the same family. Never treat an inheritance alias as a rejected identifier.

| Lens | Role line | Default `model` | Prompt template |
|---|---|---|---|
| Judgment | `reflect-judgment` | the `deep` class | `references/judgment-reviewer.md` |
| Tooling | `reflect-tooling` | the `fast` class | `references/tooling-reviewer.md` |
| Divergent | `reflect-judgment` | the `deep` class | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the delegate response body.

### 3. Synthesize

One delegate call, the default delegate role, with `model` from the `reflect-judgment` line (default the `deep` class), `access: read`. The synthesizer spot-verifies citations, which can require MCP access. Same rule as above if this host's read-only mode strips tool servers. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog. See the **encode-lessons-in-structure** principle skill.

### 5. Apply

Before applying any Accepted edit, present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

Backlog items file to whatever devex / backlog tracker your team uses automatically. Only the Accepted list waits for approval.

For each approved Accepted item, follow the Routing field exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to your host's skill-authoring flow skill and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): run the authoring-a-skill playbook's description-optimization loop.
- `new skill: <kebab-name>`: hand creation to the authoring-a-skill playbook. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done. Skip this step if it doesn't.

### 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
