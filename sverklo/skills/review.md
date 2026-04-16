---
name: Review Changes
description: Diff-aware code review with risk scoring, blast radius, and test coverage analysis.
arguments:
  - name: ref
    description: Git ref or range to review (default main..HEAD)
    required: false
---

Review the current diff using sverklo's diff-aware tools:

1. Call `sverklo_review_diff` to get changed files, risk scores, dangling references, and structural warnings.
2. Call `sverklo_test_map` to see which tests cover the changes and which files are untested.
3. For any removed symbol with dangling references, call `sverklo_impact` to see every caller.
4. For any high-risk file, read the actual diff to verify the risk assessment.

Synthesize a review with:
- Clear verdict (LGTM / request changes / blocking concern)
- Must-fix items tied to file:line
- Untested changes that need coverage
