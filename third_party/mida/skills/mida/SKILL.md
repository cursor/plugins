---
name: mida
description: >-
  Working with Mida — A/B testing, split tests, and personalization on a live
  website. Use whenever "Mida" is mentioned, and as the entry point for any
  request to create, launch, check, pause, conclude, or roll out an experiment
  on a site that runs the Mida tag. Also covers reading Mida results correctly
  (Bayesian "chance to beat original" vs. p-value), goals and events, and the
  order of operations that keeps a test's data clean.
---

# Mida

Mida is an A/B testing and personalization platform. A JavaScript tag on the
customer's site assigns visitors to variants and reports conversions; the Mida
MCP server exposes that account so you can run the whole loop — build a test,
launch it, read the result, conclude it, and serve the winner — without leaving
the conversation.

This plugin bundles the hosted Mida MCP server (`https://mcp.mida.so/mcp`,
OAuth). On first use Cursor will open a browser to sign in to Mida. Nothing is
stored locally and no API key is needed.

## Always select a project first

A Mida login can own several organizations and projects. The MCP session opens
on a **default project**, which is very often not the one the user means.

Calls scoped to another project return `Mida API error 404: Experiment not
found` — which reads like a deleted test, not a scoping miss. Do not report a
404 as "that experiment doesn't exist" until you have selected the right
project.

Start every Mida session with:

1. `list_organizations` → `select_organization` (only if the user has more than one)
2. `list_projects` → `select_project`

Then work. If a lookup 404s mid-session, re-check the selected project before
anything else.

## "Experiment #208" is not `test_id` 208

Each account numbers its own experiments, and that number lives at the **start
of the experiment's name** — e.g. `#208 | Pricing page | Annual toggle default`.
It is not the global id the API uses.

When a user says "experiment #208", call `list_experiments` and match the name
prefix. Passing `208` to `get_experiment` will either 404 or silently return an
unrelated test.

## Reading results

`get_experiment_result` reports against whichever statistics mode the project is
set to, and the two modes are read in opposite directions:

| Mode | Column | How to read it |
|---|---|---|
| Bayesian (default) | Chance to Beat Original / Chance to be Best | **Higher is better.** 95% means a 95% probability the variant beats control. |
| Frequentist | P-value | **Lower is better.** 0.05 is the conventional bar. |

Two things to hold onto before you call a result:

- **Chance-to-beat is one-directional.** It answers "is the variant better?" A
  low value means "not shown to be better", *not* "shown to be worse", and it
  cannot rank how bad a loser is. To speak about a loss, use the observed lift
  and the sample size — not the inverse of the probability.
- **Check power before calling anything.** A test with a few hundred visitors
  per arm will swing wildly day to day. `compute_experiment_statistics` and
  `get_experiment_timeseries` are there to show whether the number has settled;
  use them rather than reporting the headline figure alone.

Related tools: `get_experiment_metrics` (per-goal breakdown),
`get_experiment_distribution` (traffic split sanity check),
`get_testing_benchmarks` (how this result compares to typical outcomes).

## Order of operations

These sequences matter — getting them backwards silently corrupts a test.

**Concluding a test.** `update_experiment_status` resets the completed flag. So
if you are both stopping and concluding a test, set the status **first** and
call `conclude_experiment` **last**, or the write-up is dropped.

**Serving a winner.** `conclude_experiment` ends delivery on its own — a
concluded test stops serving even while its status still reads active. The one
exception is a test with a served winner: `serve_experiment_winner` keeps that
variant serving to everyone after the test is concluded, which is usually what
the user wants while they ship the change for real.

**Hardcoding a winner into the site.** Stop the test *before* deploying the
winning copy to source. Deploy first and the control arm starts serving the new
copy too — both arms become identical and the remaining data is noise.

## Goals and events

A test measures nothing until a goal is attached. `list_goals` /`create_goal`
manage them; `list_events` / `create_event` handle custom events the tag fires.
`update_experiment` can attach secondary metrics to a test that is already live.

When creating a click goal, the element selector is matched as a **pattern**,
not an exact string — check `list_goals` for an existing goal that already
covers the element before adding a near-duplicate.

## Before anything runs: the tag

Nothing works until Mida's tag is on the site. `get_install_snippet` returns the
snippet for the selected project. If a live test reports no visitors at all, the
tag is the first thing to check, not the targeting.

## Tool map

- **Setup** — `get_mida_api_context`, `get_install_snippet`, `get_my_access`, `get_project_configuration`
- **Build & launch** — `create_experiment`, `update_experiment`, `generate_preview_url`, `update_experiment_status`
- **Measure** — `get_experiment_result`, `get_experiment_metrics`, `get_experiment_timeseries`, `compute_experiment_statistics`
- **Finish** — `conclude_experiment`, `serve_experiment_winner`, `update_serving_rollout`, `stop_experiment_serving`, `reopen_experiment`
- **Plan** — `list_hypotheses`, `create_hypothesis`, `link_hypothesis_to_experiment`, `find_similar_tests`, `get_my_testing_history`
- **Personalization** — `suggest_pages_to_personalize`, `create_persona_campaign`, `create_target_account_campaign`

## Docs

https://www.mida.so — product and pricing. The dashboard is https://app.mida.so.
