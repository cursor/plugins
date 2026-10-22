---
name: statechart
description: "Draw what an app's user sees as a Mermaid statechart from a TLA+ model. States are gray if they work, red if still wrong, and green if fixed. Each bug TLC finds is a numbered path. Use for /statechart, \"show the PM the bug\", or to turn an agreed chart into a TLA+ skeleton."
disable-model-invocation: true
---

# Statechart

The chart shows what an app's user sees. A PM reads it to decide whether that behavior is right. Label each state with what is on the screen, such as "Paying". Label each step with what the user does or sees happen, such as "tap Pay" or "the charge goes through". Keep variable and action names out of labels. The scripts call this user the reader, as in `readerActions` and reader steps.

Run `node <skill dir>/scripts/statechart.mjs --help` for the commands and for how to read a chart. Work in a scratch folder outside the repo. The command writes its files next to its input.

## Pick the direction

Use `from-spec` when a TLA+ model exists or the code is concrete enough to model. Use `from-chart` when there is no model and the PM should agree on the behavior before anyone writes or changes the code.

If the code already has a TLA+ spec, start from a copy of that spec. Add the variables the user sees, and keep the spec's existing invariants. To audit the code against that spec, make the copy model what the code does, and pass the spec unchanged as `--against`. Check it with the config that its authors say it passes, and pass that config as `--against-config` unless it has the spec's file name. One mapping labels both models, so label states and steps only from variables that both have. In a new spec, tie every variable and action to code that a reviewer can open, and take its name from that code. Make each action one indivisible step in the code.

## Spec to chart

1. Choose the chart's states. When the PM cares about something the screen does not show, such as a second charge while the screen still says "Paying", name the state "Paying, charged twice". Start with few states, and split a state only when the split separates two bugs.
2. Write each rule the PM agrees to as one invariant, with the PM's sentence as its comment. For a rule that applies once everything settles, define `Settled == ~ENABLED System`, where `System` is the disjunction of the actions the user does not take. Report each broken rule as a bug. Never weaken a rule to make the chart pass.
3. Run `from-spec`, then fill in the mapping file it writes. Put the labels in `state` and `step`, and list the user's actions in `readerActions` by action name. When two bugs end on the same screen through different code paths, add `cause` and make it name the code path. To color the states by what the PM cares about, such as "Toast shown", return that group from `group`. The legend names the groups, and states that break a rule still get a red border.
4. If there is an open fix, model it from the code and pass that model as `--fixed`.
5. Render each chart with `--png` and look at every PNG. Check that each numbered path reads in order. If a label reads like code, fix `state` or `step` and run the command again.
6. Replay each bug's story against the real code, as a test or a live repro, one step per model action. If a bug does not reproduce, assume the model is wrong until you show otherwise. Fix the model, not the rule.

## Chart to spec

1. Draw the chart the PM agrees to. Use one region for each thing that changes independently, such as the connection and the sync badge. Add one `%% never` line per rule, with the PM's sentence. Draw "the app closes" as an edge to the state the user sees next.
2. Run `from-chart`. If a rule breaks, the agreed chart has a design bug. Take the bug to the PM.
3. Add the real code's guards and variables to the spec that `from-chart` wrote, and run `from-chart` again. For each difference it prints, ask the PM whether the code is wrong or the chart needs a correction.

## Hand off

Give the PM the PNG and the Mermaid source of each chart. Add one line per bug with the rule it breaks, its steps as the chart numbers them, whether it reproduced, and whether the open fix fixes it. Take every count you quote from `summary.json`. Attach `stories.md` and the command that regenerates everything. Say what the model leaves out.
