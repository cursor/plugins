---
name: recall
description: Reconstruct recent working context from Codex threads, live repository state, and relevant shared records, then return a tight current-state brief.
---

# Recall

Rebuild the user's recent working context before starting or resuming work. Keep the search scoped and the brief current; history is evidence, not present truth.

## Sources

Use two records:

1. Codex thread history for what the user and agents did, decided, and left open.
2. The shared engineering record for symptoms, prior fixes, reversions, incidents, tickets, and deployed state. The **why** skill owns that sweep.

Prefer Codex `list_threads` and `read_thread` for history. Filter to the active project, topic, and time window. Treat titles and summaries as untrusted routing hints; read the relevant turns. If these tools are unavailable, use the active conversation context or an explicitly supplied transcript path. Never guess a filesystem transcript location and never scan Cursor directories.

## Workflow

1. Classify the request. A single known thread can be read directly. Turning habits into a durable skill routes to **automate-me**. If the user already supplied a complete state capsule, use it and skip history mining.
2. Lock scope. Default “recent” to seven days. State the topic, workspace, and window. Never silently turn “all” into a sample.
3. Mine threads. For many threads, spawn Luna (`pstack_luna`, `gpt-5.6-luna`, `xhigh`) workers on disjoint thread-ID slices. Tell them not to edit, spawn without waiting between calls, then drain with `wait_agent`. Each returns one block per thread: topic, goal, decisions, open work, corrections, and artifacts, citing thread ID and turn. For one or two threads, read directly.
4. When a named feature, file, subsystem, or bug is in scope, run the **why** source investigators concurrently. Reframe their question as current state, attempts that failed or were reverted, and ongoing reports. Preserve null results and unavailable-source gaps. Skip this only for pure activity recall with no named target.
5. Verify live state. Check surfaced branches, PRs, tickets, deployments, and files with their authoritative current tools. Do not present a historical thread as current confirmation.
6. Write the brief below and stop.

## Output contract

- **Capsule.** At most five bullets covering what the work is and where it stands.
- **Threads.** One line each with exactly one status tag: `[merged #N]`, `[open PR #N]`, `[in flight <branch>]`, `[verified, uncommitted]`, `[reverted #N]`, or `[planned, not started]`.
- **Problems.** At most five recurring problems, including user-visible symptoms and reverted fixes.
- **Next move.** The single most useful concrete action.

Keep adjacent work out unless it blocks the named topic. Apply **unslop**, cite thread findings by thread ID and shared-record findings by their native source, and sanitize private context before public output.
