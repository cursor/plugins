# Understand the code before changing it

Before you edit unfamiliar code, use pstack to build an up-to-date explanation with sources. Use `/how` to trace behavior. Use `/why` to find past reasons. Use `/teach` to combine both.

## Trace the code path with `/how`

Run:

```text
/how trace what happens from the CLI command to the final database write.
Name the owning modules and the error path.
```

[`/how`](../../skills/how/SKILL.md) reads the code and returns the runtime flow, key types, file map, and non-obvious behavior. For a large subsystem, `/how` starts two to four read-only explorers. It then starts one explainer. For a small question, `/how` starts one explainer directly.

If you also want an architecture review, ask for Critique mode:

```text
/how explain the sync service.
Then critique its ownership boundaries.
```

The critique follows the explanation. This order keeps review comments tied to the real design.

## Find past reasons with `/why`

Run:

```text
/why was this retry limit set to five?
Which constraints still apply?
```

[`/why`](../../skills/why/SKILL.md) starts from source control. It also searches the evidence categories your connectors expose. These categories can include tickets, long-form documents, team discussions, runtime signals, error records, and product data.

The report separates direct evidence from inference. When the evidence supports several explanations, the report lists each one. The report also lists missing evidence and every source category searched.

Use both skills when mechanics and history matter:

```text
/how explain how request retries work now.
/why explain why the retry policy has this shape and which assumptions may be stale.
```

## Combine behavior and history with `/teach`

Run:

```text
/teach me how this PR changes retries.
Explain why this design was chosen.
Tell me what I should verify as a reviewer.
```

For a subsystem, [`/teach`](../../skills/teach/SKILL.md) runs `/how` and `/why` in parallel. For a small change, `/teach` may run only one. It combines the findings in plain language.

Ask the explanation to test the design argument:

```text
/teach me how this change works. Convince me that it fixes the cause instead of hiding the symptom.
```

## Resume one run with the Session pickup playbook

If you take over a prior run, give `/poteto-mode` the prior transcript, a cloud-agent URL, or the pushed branch:

```text
/poteto-mode take over this branch with the Session pickup playbook.
Read the prior work record.
Identify completed work.
Continue from the first unfinished step.
```

The [Session pickup playbook](../../skills/poteto-mode/playbooks/session-pickup.md) reconstructs the branch, decisions, and open work. It does not repeat completed investigation. It verifies inherited claims against the original goal before it reports the outcome.

## Investigate a topic across runs

If the topic spans several sessions, start a new Investigation:

```text
/poteto-mode investigate the current state of request retries.
Use /how to trace the retry code path.
Use /why to find the decisions that still constrain the retry policy.
Do not change code.
```

Add the branch names, PR links, or document links that define your scope. The connectors can search only the evidence they expose.

Next: [Design the change](./04-design.md).
