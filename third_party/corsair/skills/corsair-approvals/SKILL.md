---
name: corsair-approvals
description: Use when a Corsair call or automation run says it needs approval, was denied, timed out waiting for approval, or is blocked by a permission mode, or when the user asks what Corsair's permission modes allow.
---

# Approvals and permission modes

Every action has a risk level: read, write, or destructive. The Corsair connection this agent uses, a link or a client sign-in, has a mode, and the mode decides which risk levels go through, which wait for a person to approve them, and which are refused.

| Mode (as Corsair labels it) | Reads | Writes | Destructive |
| --- | --- | --- | --- |
| Read (`readonly`) | allowed | refused | refused |
| Cautious (`cautious`, the default) | allowed | allowed | need approval |
| Strict (`strict`) | allowed | need approval | refused |
| Open (`open`) | allowed | allowed | allowed |

You can't change the mode. Whoever manages the connection sets it in Corsair.

No tool reports this connection's mode, so don't guess it. Work from what you can see: no `add_triggers` tool usually means the link is Read, no `add_integrations` tool means it can't add apps, and a "blocked by permission mode" error names the mode. Otherwise explain the four modes and say the link's settings in Corsair show which one applies.

Your client may also ask the user to confirm each `run_script` call, because the tool can make changes. `read_data` is marked read-only, so clients usually run it without asking. Those prompts come from the client, not from Corsair, and are separate from everything below.

## What you'll see and what to do

**"Approval required. Visit <link> to approve or deny, then tell the agent to retry this action."**

1. Give the user the link exactly as returned and say in plain words what the action does ("delete the repo acme/old-site").
2. Stop and wait. Don't retry on a timer, and don't look for another way to get the same result.
3. When the user says they approved it, call that one action again with exactly the arguments from the first call: copy them, don't recompute them. Leave out any other changes the first script already made, so they don't happen twice. An approval covers that one call, once. Different arguments need a new approval.

**"... was denied by the user. Await further instructions before proceeding."**
Stop. Tell the user it was denied and ask what they'd like instead. Don't retry.

**"... timed out waiting for approval."**
The request expired. Ask whether to request it again. If yes, run the call again to get a new link.

**"... is blocked by permission mode 'readonly'"** (or `'strict'`)
This connection can't do that kind of action at all. Tell the user which action was blocked and that whoever manages the connection can change its mode in Corsair. Don't look for a workaround.

**"... requires user approval before it can run"** with no link
Corsair couldn't create an approval link. Tell the user what it said and stop.

## Automations

A run that `list_runs` shows as "needs approval before it can run" is held before any step runs, because the automation needs approval or one of its steps is destructive. Call `get_run` to see what it would do, and tell the user. It's approved or denied in Corsair, not from here. Don't run its steps yourself with `run_script`.
