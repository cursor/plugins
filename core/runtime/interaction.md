# pstack runtime: task lists and questions

Two host primitives that pstack leans on and that vary across hosts.

## The task list

Every playbook opens with "copy the playbook's steps into a task list, verbatim, before any
task-specific todos". Read `run-record.py --run <id> tasks --json` for the canonical text,
phase ids, requirements, and state. The checklist exposes skipped work; the completion
checker enforces recorded requirements. Use the native task tool only when the session
actually offers it, with a Markdown fallback on every host.

| host | mechanism |
|---|---|
| Cursor | native todo list |
| Claude Code | `TodoWrite`, one item per step |
| Codex CLI | the plan tool, one step per item |
| Copilot | the session's task tool when exposed; otherwise a Markdown checklist |

Rules that hold everywhere:

- The playbook's steps go in **first**, **verbatim**, before task-specific items.
- A step you decide to skip **stays in the list** with `skip: <one-line reason>`. Deleting it hides
  the decision. This is the difference between an audit trail and a to-do list.
- Keep the exported phase state. Parallel work can have several active phases; a host tool
  that permits only one active item uses the enclosing playbook step and lists its branches.
- The list is updated as work completes, not reconstructed at the end.
- Update the run record first, then synchronize the host list from `tasks --json`. A native
  task marked done does not by itself satisfy a completion gate.

Where no list primitive exists, the checklist in the reply is not decoration. It is the artifact.

## Asking the user

Upstream calls Cursor's `AskQuestion`. The portable rule is about *when* to ask, and that rule is
host-independent and more important than the mechanism.

**Before asking, classify the question.**

- Answerable by running something? Behavior, timing, layout, output, performance, whether an eval
  separates. **Not the human's question.** Build the smallest sketch that settles it and let the
  result decide. This is the Prototype playbook.
- Answerable from the codebase or its history? **Not the human's question.** Investigate.
- A genuine product or preference call no experiment can settle? **Ask.**
- A fact about the world outside the repo that neither running something nor reading the code and
  its history can establish? Deployment topology, how many workers or hosts, what a third-party
  provider actually sends and how it retries, data volumes, who owns a system, a constraint someone
  agreed outside the code. **Ask.** Do not infer it, and do not fill it with a plausible default.
  Batch every such question into one ask, early, before the work that depends on the answers, and
  beside each one state the assumption you will use if it goes unanswered. In an unattended run (the
  user said they are stepping away, an automation started the run, or `.pstack/host.json` records
  `ASK: false`), do not stop: proceed on the stated assumptions and list each one as an open question
  in the reply.
- Irreversible, or outside the repo? **Ask**, always: force-push to a shared branch, deploy, data
  deletion, a message to a customer.

The first two buckets stay yours to answer. The outside-world bucket is not permission to ask what
`how` or `why` could have told you: check the code and its history first, then ask only about what
is left. An assumption that shapes a shipped line is a finding, and the reply names it.

**Mechanism by host.**

| host | mechanism |
|---|---|
| Cursor | `AskQuestion` |
| Claude Code | `AskUserQuestion`, structured options |
| Codex | `request_user_input_async`, several questions in one call (seen in the VS Code extension); prose with numbered options where the tool is not offered |
| Copilot | prose, with numbered options |

In prose, still offer options. "Which of these, 1, 2, or 3, and here is what each costs" gets a
usable answer. "What do you want to do?" does not.

**On a reversible call, do not ask at all.** Proceed, present the result, let the user
course-correct. This is `never-block-on-the-human`, and on hosts where asking is a plain message it
matters more, not less: a prose question is easy to miss and stalls an autonomous run.
