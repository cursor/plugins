---
name: mida-experiments
description: >-
  Build and launch a Mida A/B test end to end — writing the hypothesis, creating
  the experiment and its variants, attaching a goal, previewing the variant
  before it goes live, launching, and deciding when there is enough data to
  call it. Use when the user asks to test, try, or experiment with a change to
  their site ("test a new headline", "try a different CTA", "does the shorter
  form convert better"), or to review a test someone has already set up.
---

# Running an experiment in Mida

Read the `mida` skill first for project selection and result-reading rules. This
skill is the workflow.

## 1. Start from a hypothesis, not a change

A test is only worth running if you can say in advance what you expect and how
you would know. Push for the shape:

> Changing **X** for **audience Y** will improve **metric Z**, because **reason**.

`create_hypothesis` stores it, and `link_hypothesis_to_experiment` ties it to the
test so the conclusion can be read against what was actually predicted. Before
writing a new one, `find_similar_tests` and `get_my_testing_history` will show
whether this account has already run something close — a repeat of a test that
already lost is the most common waste.

## 2. Change one thing

If a variant changes the headline, the button colour, and the form length at
once, a win tells you nothing about which of the three did it, and a loss tells
you nothing about which to keep. When a user describes a bundle of changes, say
so and offer to split it — unless they are deliberately testing a whole new
page, which is a legitimate and different kind of test.

Keep the control as-is. Never "improve" the control while building the variant.

## 3. Create the experiment

`create_experiment` takes the target URL rule, the variants, and the traffic
split. Two things to get right at creation time:

- **The URL rule is a pattern.** A test meant for every product page needs a
  rule that matches them all; a rule pasted from one specific URL will match
  that page only. Confirm which the user means.
- **Query strings are matched literally.** An entry URL written with `?param=x`
  will only match visitors whose URL carries that exact query string — which
  usually is not what someone wants.

`get_experiment_distribution` after launch confirms traffic is actually splitting
the way you configured it.

## 4. Attach the goal before launching

An experiment with no goal collects visitors and measures nothing. Check
`list_goals` for an existing goal that already tracks the action, and reuse it
rather than creating a near-duplicate — duplicates split the same conversions
across two metrics.

Pick a primary goal that the change could plausibly move. A headline test
measured only on checkout completion will almost never reach significance;
measure the click the headline is trying to earn, and keep the downstream metric
as a secondary via `update_experiment`.

## 5. Preview before you launch

`generate_preview_url` returns a link that forces a given variant, so the user
can see the change on their real site before a single visitor does. Always offer
it. Broken variant markup that ships to 50% of traffic is the expensive failure
mode here, and it is entirely avoidable.

## 6. Launch and leave it alone

`update_experiment_status` starts delivery. Then:

- **Do not read the result on day one.** Early numbers swing hard and reading
  them invites stopping on noise.
- **Run at least one full business cycle** — usually a week, so every weekday is
  represented in both arms. A test stopped on Wednesday inherits Wednesday's
  traffic mix.
- **Do not edit a running test.** Changing the variant, the goal, or the
  targeting mid-flight mixes two different experiments into one dataset. If the
  change is necessary, stop the test and start a fresh one.

## 7. Call it

Use `get_experiment_result` with `compute_experiment_statistics`, and check
`get_experiment_timeseries` to see whether the result has settled or is still
moving. Then `conclude_experiment` with a written conclusion — what changed,
what happened, and what to do next. That write-up is what makes the account's
history worth anything later; a concluded test with an empty conclusion is a
test nobody can learn from.

If the winner should keep serving while the change gets built for real, use
`serve_experiment_winner` — and see the ordering rules in the `mida` skill
before deploying that variant to source.
