---
name: pre-action-review
description: "Get an independent, signed verdict from invinoveritas before an irreversible or high-consequence action — a force-push, a merge to main, a production deploy, a destructive shell command, a schema migration, a fund transfer, or any action a hidden agent flaw could make hard to undo. Use before executing, not after."
---

# Pre-action review

Before you execute an action that would be hard or impossible to cleanly undo, call the
`review` tool (via the `invinoveritas` MCP connection) and pass a plain-text description of
exactly what you're about to do. It returns an independent `approve` / `approve_with_concerns` /
`reject` verdict with a confidence score and, on reject, specific blocking issues.

## When to use this

Call it before, not after, whenever the action fits any of these:

- **Destructive or hard-to-reverse shell commands** — `rm -rf`, dropping a database/table,
  force-pushing over history, deleting a cloud resource, revoking credentials.
- **Merges and branch operations at scale** — this matters more than usual on Origin-style
  workflows where many agents branch, resolve conflicts, and merge with little or no human in
  the loop per merge. A signed pre-merge verdict is a real, checkable second opinion on a merge
  that might otherwise go straight to `main` unreviewed.
- **Production deploys and migrations** — anything that changes live infrastructure, schema, or
  configuration in a way a rollback might not cleanly reverse.
- **Financial or irreversible-by-nature actions** — a payment, a transfer, a trade, deleting a
  user's data, sending an external communication on someone's behalf.
- **Anything you're not fully confident about** — if you'd want a second pair of eyes on this
  before running it yourself, that's the signal to call `review`.

Do NOT call it for routine, easily-reversible edits (a normal code change on a feature branch, a
local test run, reading a file) — that's noise, not signal, and burns the user's call budget.

## How to call it

```
review(
  artifact="<plain description of the exact action: what command/merge/deploy, on what target,
             with what data at stake>",
  artifact_type="general"   # or "trade" / "onchain_action" for financial actions
)
```

Be concrete: name the actual command, the actual branch/target, and any stated safeguards (a
tested backup, a dry-run result) — a vague artifact gets a vague, less useful verdict.

## What to do with the verdict

- **`reject`** — do not proceed. Surface the verdict's `summary` and `issues` to the user
  plainly, and ask before doing anything the verdict flagged as a blocker. Don't retry the same
  action hoping for a different verdict; if the user overrides it, that's their call to make
  explicitly, not yours to route around.
- **`approve_with_concerns`** — proceed only after surfacing the specific concerns to the user;
  don't silently swallow them.
- **`approve`** — proceed normally.

## Honest scope

This is an independent judgment call on the action described, not a guarantee. It doesn't
execute anything itself, doesn't have access to your repo or environment beyond what you put in
`artifact`, and a vague or incomplete description produces a correspondingly less reliable
verdict. Optional `sign=true` on the call returns a portable, cryptographically verifiable proof (check it
independently via the `verify_proof` tool on this same MCP connection, free, no auth) if you want
a durable, checkable record that this review happened before the action — useful for audit trails
on agent-driven merges specifically.

Free to register (`POST https://api.babyblueviper.com/register`, no payment), free try-it calls,
pay-per-use after. See this MCP connection's own tool list for `verify_proof` and other available
tools.
