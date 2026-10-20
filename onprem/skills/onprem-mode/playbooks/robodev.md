# Robodev (managed deep review)

External multi-model deep review of a diff or a full tree. Use when the task is "robodev this", "deep external review", or a pre-ship cross-check of a large change. The review fleet runs outside the on-prem boundary, so this is the evidence path, not the judgment path.

1. Boundary gate. Confirm the content under review may leave the boundary. Internal content reviewed on the internal fleet is fine. Content that a recipient's on-prem policy keeps internal is not: stop and use the **panel** playbook instead.
2. Host gate. The CLI only knows the internal GitHub hosts (github.tesla.com, github-it.tesla.com, github-ap.tesla.com, github-fw.tesla.com). If the repo's origin is on a known host, continue there. If not, build a mirror: a private mirror repo on a known host, a fresh clone for the review, and a deleted mirror when the review returns. For a full-tree review of a young repo, give the mirror history an empty root commit (commit-tree the existing trees onto an empty-tree root) so the whole tree is the diff. Never rewrite the real repo's history for this.
3. Choose the base ref. Everything between the base ref and the checkout is what gets reviewed. Pick the ref that makes the diff match the question: a branch point for a feature, the empty root for a full tree.
4. Run with capture to disk. `robodev review --deep --ref <base> --reasoning-effort high --guidelines "<guidelines that name the artifact and its invariants>" -p > <evidence-dir>/robodev-<utc-stamp>.json`. Terminal capture has eaten a final JSON before; the file is the record.
5. Triage. Rank by severity. Every finding is a claim until verified against the source: read the named lines before believing a finding, and record why a false positive was dropped. Never auto-apply patches.
6. Hand off. The verified findings go to the fixer as a ranked list. If a **panel** also reviewed the same artifact, agreement between a managed finding and an on-prem judge is high signal; record the overlap.
7. Clean up. Delete the mirror repo, the temp clone, and any temp branches or remotes made for it. Keep the result JSON; it is the evidence.

A managed verdict is never a panel seat and never the cross-judge. It informs; the on-prem panel decides.
