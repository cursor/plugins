---
name: setup-pstack
description: "Detect the current agent host, probe what it can actually do, and write the pstack config that every other pstack skill reads. Use for /setup-pstack, first-time pstack setup, 'configure pstack', changing pstack's model roles or reasoning budget, or when pstack skills are degrading unexpectedly."
---

# Setup pstack

Writes two files. `.pstack/host.json` records what this host can do. `.pstack/models.md` records
which model class each role uses. Every other pstack skill reads them. Re-running overwrites both,
so it is idempotent.

## Step 1. Identify the host

Determine which agent host is running you. Do not guess from the repository contents; the same repo
is opened by different hosts. Use, in order: an explicit statement in your system prompt, the
config directories present in the environment (`~/.claude`, `~/.codex`, `~/.cursor`,
`.github/copilot-instructions.md`), and finally ask the user.

Match against the table in `runtime/host-profile.md`. An unrecognized host is not an error. Record
it as `"host": "unknown"` and probe everything in step 2.

## Step 2. Probe capabilities

For a host in the profile table, adopt its row as the starting point and verify only the two cells
that most often differ from the default: whether you can actually spawn a delegate, and whether you
can address a model per delegate.

For an unknown host, probe each capability once, cheaply:

- `DELEGATE`: spawn one trivial delegate ("reply with the word ok"). Success means yes.
- `PARALLEL`: issue two trivial delegates in one message. Both returning means yes.
- `MODEL_CHOICE`: spawn one delegate naming a non-default model. Record one of three values, not a
  boolean. `true` only if you can address **different model families** (different vendors or
  genuinely different models). `"partial"` if the host accepts only tier aliases or a reasoning-effort
  setting, which selects a strength but not a distinct model. `false` if the model is the user's to
  pick and the agent cannot. A rejected identifier means the error text usually lists what is valid:
  record that list. **`"partial"` counts as absent for tier purposes**, so a host with delegation,
  parallelism and only tier aliases is Tier 2, not Tier 3.
- `BACKGROUND`: whether a delegate can outlive the turn.
- `ASK`: whether a structured-question tool exists.
- `TODO`: whether a task-list tool exists.

**Never record a capability you have not seen work.** A capability wrongly recorded as present is
worse than one recorded as absent, because the skill that relies on it fails mid-playbook instead of
degrading cleanly at the start.

## Step 3. Resolve the tier

From the probed capabilities, compute the default delegation tier per `runtime/capabilities.md`:

- `DELEGATE + PARALLEL + MODEL_CHOICE` -> Tier 3
- `DELEGATE + PARALLEL` -> Tier 2
- `DELEGATE` -> Tier 1
- otherwise -> Tier 0

Tell the user the tier in one sentence, and what it costs them. Tier 0 is a usable pstack. Say that
plainly rather than presenting it as a broken install.

## Step 4. Enumerate models

List the models you can actually address on this host. On hosts that take tier aliases rather than
slugs (`opus`, `sonnet`, `haiku`), those aliases are the list. On hosts where the user picks the
model and the agent cannot, the list is `inherit` alone, and that is a complete answer.

Never write a model identifier you have not confirmed is addressable in this session. `inherit` is
always valid.

## Step 5. Budget, map, and confirm

Read existing `.pstack/models.md` first. Preserve explicit model-family, list, and inheritance
choices on re-runs. Drop retired role lines absent from `runtime/roles.md` and list them when
confirming the new mapping. With no config, use the current role defaults.

Ask for the reasoning budget through the host's structured question tool when available:
`unlimited` requests `max`, `large` requests `xhigh`, `medium` requests `high`, and `small`
requests `medium`. First setup defaults to `large`; re-runs show the saved budget. Apply the
budget to each concrete model, including panel entries, using only model/effort combinations
confirmed available on this host. Choose the highest supported effort at or below the request;
if none is confirmed, mark the role as needing a choice. Hosts that cannot configure effort
keep their own default and report the limitation. Inheritance aliases leave model and effort
unset. Budget is stored as a comment in the role config; it is optional and can be removed to
use the host's default effort.


Show every role from `runtime/roles.md` with the class it resolves to and the concrete model that
class picks on this host. Ask whether to accept as-is or override specific roles. Use a structured
question where the host has one, numbered prose options where it does not. Offer `inherit` for every
role: that is how a user on an auto-routing plan stays on it.

Panel roles (`arena-runners`, `architect-runners`, `interrogate-reviewers`, `arena-cross-judge`)
take a list; its length sets the fan-out. The upstream default is two entries, one `deep` and one
`fast`. Preserve a user's configured width. Write confirmed model identifiers, not the bare
word `panel`. When only one model is available, keep two entries with distinct stances from
`runtime/delegation.md`, and report that this does not provide cross-model diversity. Architect
still requires two structurally distinct sketches, regardless of the number of available models.

## Step 6. Write `.pstack/host.json`

```json
{
  "host": "claude",
  "detected": "<ISO date>",
  "capabilities": {
    "DELEGATE": { "value": true, "source": "observed" },
    "PARALLEL": { "value": true, "source": "observed" },
    "MODEL_CHOICE": { "value": "partial", "source": "observed" },
    "BACKGROUND": { "value": true, "source": "default" },
    "ASK": { "value": true, "source": "default" },
    "TODO": { "value": true, "source": "default" },
    "MCP": { "value": true, "source": "default" }
  },
  "tier": 2,
  "models": { "deep": "opus", "fast": "sonnet", "balanced": "sonnet", "panel": ["opus"] },
  "available_models": ["inherit", "opus", "sonnet"],
  "notes": "Tier aliases only. Panel runs on stances."
}
```

`available_models` lists every model this session actually addressed in step 4, such as a delegate
call that returned. Every concrete name in `models` and in `.pstack/models.md` must appear in it.

`host` is this session's host key: `claude`, `codex`, `copilot`, `cursor`, `generic`, or `unknown`.
It must name the host this project is installed for, because the file is that host's profile.
Mark a capability `observed` only when you exercised it in this session, and `default` when you
took it from the profile row. `tier` must follow from the capabilities by the rule in step 3. When
the project switches hosts, `pstack update --host <key>` saves this file under
`.pstack/hosts/<host>/` and restores the other host's copy, so each host keeps its own profile. Run
`pstack doctor` after writing it: it rejects malformed JSON, a profile from another host, a tier the
capabilities do not support, and recognizable model-vendor mismatches. It does not query the host's
model catalog. It trusts the models in `available_models` and names any configured model missing from
that list, once per model. Without the list, every concrete model is reported as unverified. Record
what the probes reached, and follow the fallback ladder when a model fails.

## Step 7. Write `.pstack/models.md`

One line per role. A deleted line falls back to the class default in `runtime/roles.md`.

```
# pstack role configuration. One line per role. Delete a line to fall back to the class default.
# `inherit`, `inherit-parent`, and `auto` leave model and effort unset.
# budget: large (xhigh)
feature, refactoring: fast
bug-fix: fast
perf-issue: fast
hillclimb: fast
judgment-and-prose: deep
hardest-tasks: deep
how-explorer: fast
how-explainer: deep
why-investigators: fast
why-synthesizer: deep
reflect-tooling: fast
reflect-judgment: deep
# Panel roles take a list. Length = fan-out. Replace these with real models.
arena-runners: <model-a>, <model-b>
arena-cross-judge: <model-a>, <model-b>
swarm-workers: fast
architect-runners: <model-a>, <model-b>
interrogate-reviewers: <model-a>, <model-b>
comment-sicko: fast
```

## Step 8. Install the mode shim

Per `runtime/sticky-mode.md`, add the `pstack:mode` block to this project's always-on instructions
file. On this host that file is `{{MEMORY_FILE}}`. If the block is already present, leave it alone. Ask before creating an
always-on file that does not exist yet, since it changes every future session in the repo.

## Step 9. Offer a verification skill

Check whether the project can drive its real artifact for proof: a `control-*` skill (or a legacy
`verify-*` one), a harness, an e2e runner. If not, offer once, in one sentence: a project-local verification skill lets agents
drive the app the way a user does and prove changes work, and `/create-verification-skill` writes
one. On no, move on without pushing.

## Step 10. Report

Name the host, the tier, the roles that differ from the defaults, and the files written. One
paragraph. Say that re-running updates everything.
