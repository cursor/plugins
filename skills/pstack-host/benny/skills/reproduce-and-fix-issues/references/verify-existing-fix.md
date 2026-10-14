# Verify an existing fix

Use this mode when an open pull request or merged commit plausibly fixes the report.

The existing artifact owns the fix. Verify it. Do not edit it, author a competing patch, or open another pull request.

## Qualify the artifact

Require one concrete artifact:

- An open pull request with code changes that address the symptom
- A merged pull request
- A merged commit with matching code and intent

A thread claim, tracker status, branch name, or cause hypothesis without a pull request or commit is not enough.

When several artifacts exist, choose the one linked from the source thread or tracker. Otherwise choose the closest match to the affected code and state why.

## Protect the working tree

Use an isolated worktree or another clean checkout when the repository supports it. Do not overwrite user changes.

Record:

- Baseline revision
- Patched revision
- Pull request or commit URL
- Build and environment inputs shared by both runs

Use regular `github.com` pull request links.

## Measure the baseline

For an open pull request, use its base branch as the baseline.

For a merged fix, use the revision immediately before the fix when that revision builds and represents the old behavior.

Through the configured control adapter:

1. Bring up the baseline app.
2. Confirm the correct app and environment.
3. Run the reported path through real UI actions.
4. Observe the discriminating symptom.
5. Reset and repeat it.
6. Capture baseline recording, screenshot, and state check.

If the symptom does not appear twice on the baseline, there is no baseline. Do not claim that the fix works.

## Measure the patched build

Build and run the pull request or fix commit with the same environment and data.

1. Run the same UI path.
2. Repeat it twice.
3. Confirm that the broken state is gone.
4. Confirm the expected state appears.
5. Capture after recording, screenshot, and the same state check.

Do not stop at compilation or tests. The after result must come from a running patched app.

## Outcomes

### Confirmed

The baseline reproduces twice and the patched build resolves it twice.

- Mark operations status as verified.
- Link the artifact.
- Post one concise source-thread reply after the source preflight.
- Include the before and after result.
- Open no pull request.

### Insufficient fix

The symptom appears on both baseline and patched builds.

- Mark operations status as reproduced but not fixed.
- Link the artifact and say it did not resolve the symptom.
- Post the normal confirmed-repro source update if the run has not already used it.
- Open no competing pull request.

### Inconclusive

The baseline does not reproduce, the patched app cannot run, or the evidence does not show the discriminating state.

- Do not claim success.
- State which half could not be measured.
- Keep the result in the operations thread or run output.
- Post nothing in the source thread unless a direct question requires an answer.

## Cleanup

Stop both builds, remove temporary profiles and captures according to retention policy, and return the repository to its prior state without discarding user work.
