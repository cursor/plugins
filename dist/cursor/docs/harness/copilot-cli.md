---
title: pstack in GitHub Copilot CLI
description: Native Copilot tool, model, and permission adapter.
---

## Installation and loading

Run `copilot plugin install .` from the checkout, or
`copilot plugin install erikschlegel/fde-skill-stack` after publishing this tree.
Use `copilot plugin list`, then start a fresh session and inspect `/agent` and
`/skills list`. Portable skills live in `skills/`; Copilot agents live in
`com.github.copilot/agents/`. No extension or provider API keys are required.

## Tool mapping

Copilot delegates with native `task`. Inspect its live schema before supplying
arguments; Cursor Task arguments and Local runSubagent arguments are not portable.
Use exposed reading/search/editing/shell tools. Agent allowlist aliases are
`read`, `search`, `edit`, `execute`, `agent`, `web`, and `todo`.
Use question and tracking facilities when present; otherwise the parent pauses
at consequential questions and maintains a checklist.

`pstack-reader` has only `read`/`search` and `strict-tools-list: true`.
Check effective tools before use. `poteto-agent` can edit and execute verification.
Test-running reviewers are writers because a shell can mutate files; isolate
them in worktrees. A read-only reviewer returns hypotheses for the parent to test.

Use native background/isolation/continuation only when the task schema offers
it. Otherwise await completion, use explicit local worktrees, and make no promise
of workers surviving session termination. No GitHub cloud-agent support is implied.

## Models

Use `/model` for entitled models and vendor/provider grouping. The status line
shows the selected model. Reasoning choices are shown for supported models; use
the left/right keys, not suffix edits. `copilot --model <exact-ID>` chooses a
session model, not automatically a worker model.

Resolve central roles against this inventory. If the live task accepts model
selection, use its supported fields. Otherwise generate model-specific native
agents with the bundled config command, then restart and delegate to those exact
agents. Native CLI agents can use `model-policy: required`; verify your installed
version supports it. Never silently invoke the inherited bundled reader when
a required named-model reviewer was requested.

Follow [configuration precedence](../configuration.md); do not overwrite native
Copilot settings. Organization policy and entitlements remain authoritative.

Official references checked on 2026-11-07:
[plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference),
[custom agents](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli),
[model selection](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/choose-a-model).
