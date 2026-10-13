---
name: principle-deterministic-proof
description: "Apply to any claim of done, fixed, or working on the on-prem stack. Prefer a scripted, rerunnable check over a model self-report. 'It compiles' and 'the model says it works' are not proof."
disable-model-invocation: true
---

# Deterministic Proof

Prove the result with a check that runs the same way every time and that a reviewer can rerun. A model's report that it worked is a claim, not a proof.

**Why:** On-prem models are more prone to confabulating a successful step than to running one they did not take, and a self-report cannot be audited after the fact. A deterministic check — a script, a test, a command with an exit code — is the same input every time and gives the same output. It is the only kind of evidence that survives the session.

How to apply:

- **Script the check when you can.** If a command or test asserts the result, run it and keep its output. The script is the artifact.
- **The check must be able to fail.** A verification that cannot fail is not a verification. If the assertion would pass even when the code is wrong, it is not proof of the thing you claim.
- **Name what the check covers.** "The test passes" is not enough. State the behavior the test asserts, and flag what it does not cover.
- **When no deterministic check exists, say so.** A model self-report is the last resort, and it is labeled as such in the reply: "no script covers this; the model reports X, which I have not independently verified."

This pairs with **verifiable-units**: each unit's check is the deterministic proof for that unit, and the sequence of checks is the proof for the whole.
