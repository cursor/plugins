# Disposition <n> — answer to review-<n>.md

<!--
Written by the writer after every review that has findings, before any fix
round ends. One row per B-n and S-n in review-<n>.md — no finding is accepted
or rejected without checking it first (Kander fix-round rule; reviewers are
wrong sometimes, and "tests pass" does not reject a finding).

The reviewer of the next recheck reads this file: it is pointers and verdicts,
not narrative. Check it before handing back:
  python3 <skill>/scripts/check-disposition.py <task-dir>/review-<n>.md <this file>

结论 — exactly one of:
- 已修复: fixed. 证据 = the changed `path:line` or the check that now passes.
- 驳回: the finding is wrong, or is outside this change. 证据 must show it:
  the `path:line` that contradicts its premise, or for a problem that already
  existed, the same code at the base (`<base>:path:line`). "Unlikely" or
  "tests pass" is not evidence.
- 无法核实: the deciding fact cannot be established from the repository or an
  executable check. 理由 names what is missing. It goes to the human (the
  delivery report's 要你决定), never treated as 驳回.
- 暂缓: S-n only — a suggestion left for later. 理由 says why.

A B-n tagged [机械] (comment or doc that contradicts the code, dead code, a
redundant test) that is 已修复 needs no recheck when every open B-n is like
that; the script says RECHECK: skip.
-->

| 项 | 结论 | 理由（一句话） | 证据 |
| --- | --- | --- | --- |
| B-1 | 已修复 | <一句话> | `<path:line>` |
| S-1 | 暂缓 | <一句话> | — |
