# Recorded workflow requirements

Poteto-mode is a model-led workflow. The parent selects a playbook, follows its skills, and uses
host tools to do the work. The recorder checks explicit completion requirements for all 23
bundled playbooks. It cannot prove that a saved output is truthful or that every prose instruction
was followed. Native task tools and model selection still require the capabilities of the session.

`build/route-contracts.json` declares required artifacts, verification, review, delegation, permitted
skips, and ordering. `build/gen-routes.py` joins those requirements with the playbook text in
`routes.json`. A build fails if a playbook has no contract or a contract references missing phases.
These are minimum recorded gates; they do not encode every nested skill's behavior. Standing
programs with concurrent lifecycle rules do not inherit a linear ordering from their numbered list.

## One record for tasks and progress

After initialization, run `run-record.py --run <id> tasks --json`. The output includes the full
numbered playbook steps, exact phase IDs, current recorded state, notes, and requirements. Bug fix
groups its named phases under the six playbook steps. Opening a PR exports its named sections.
The plain `tasks` command renders a Markdown checklist. Update the record first, then synchronize
the native task tool from the export. A task's done mark is a recorded outcome; use `check` to
determine whether the evidence requirements are satisfied.

For a required evidence gate, start its phase, do the work, save its output, and record:

```text
run-record.py --run <id> evidence --kind <artifact|verify|review> --result <pass|fail|inconclusive> --output <path> --phase <phase-id>
```

An artifact is the actual deliverable: a report, plan, trace, or another reviewable output. A
verification receipt contains observed results on the applicable surface. Review receipts contain
the verdict. Save outputs under `.pstack/` or outside the workspace when they should not alter the
code fingerprint. Keep one immutable file per receipt; editing its file invalidates the digest.
Delegates use `delegate ... --phase <phase-id>` to identify the attempt they served. Where the
contract permits a parent owner, the phase note must explain the actual host or policy limitation
and how review separation was preserved.

Evidence associated with an earlier attempt cannot satisfy a new attempt. Required verification
and review must describe the current workspace fingerprint. A failed review requires a subsequent
passing review, and open actionable findings must also be resolved. A mandatory gate cannot be
skipped. Record it blocked or failed if its condition cannot be met.

## Existing and bespoke runs

Built-in phase lists cannot be replaced with `--phases`. Older records with a narrowed list fail
the completion check. Existing runs retain their graph history; completion uses the installed
contract, so an update may reveal missing evidence in a previously accepted record.

For bespoke work use `--route figure-it-out --phases <a>,<b>,<c>`. Each named phase requires an
artifact. Phases named `verify` and `review` require passing current evidence of that kind. Keep
IDs unique. A bespoke route still needs a task-specific design for its gates; it is not equivalent
to a bundled route merely because its phase labels resemble one.

The observer uses the same checker. It can expose unmet requirements, but does not prevent the
host model from ending a turn. No cross-host completion hook is installed. A final response and
a run satisfying its recorded requirements are separate events.

## Validation scope

`packaging/tests/test_run_contracts.py` exercises every bundled route, including rejection of
empty records and acceptance of required synthetic receipts. It also covers retries, stale
evidence, mandatory skips, replacement contracts, task text, and phase IDs. Existing Bug fix
tests exercise baseline and harness rules in Git repositories.

`evals/tasks/webhook-portable.json` provides a reproducible behavioral-evaluation fixture. The
harness tests run its real oracle against the broken baseline and the reference fix, without
starting model sessions. This remains one engineering scenario. Routing accuracy and consistent
skill execution across hosts need separate live evaluations before making broader reliability claims.
