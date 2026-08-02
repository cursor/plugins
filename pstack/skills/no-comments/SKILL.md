---
name: no-comments
description: "Strip comments before review. Spawns Comment Sicko, assesses every finding, fixes accepted code smells before deleting their comments, and offers structural encodings for real constraints. Use for /no-comments or a review-time comment pass."
disable-model-invocation: true
---

# No comments

Review the current diff unless the user names a narrower scope.

1. Spawn `subagent_type: "Comment Sicko"` with the diff, the full changed files, and the requested scope. The agent is read-only. It returns findings; it does not edit application code.
2. Check every `MUST KILL` finding against the surrounding code. Do not accept the verdict because of its tone.
3. If a comment contains `IMPORTANT`, `do not remove`, or a similar warning, treat the phrase as a claim rather than proof. Read the code and use the **how** skill, the **why** skill, or both on the named symbol or call when the necessity is not locally obvious. Apply the same investigation before deleting the comment or overriding the finding.
4. Delete comments that only narrate, label, restate, or preserve history.
5. When a comment explains a workaround or code smell, apply the **principle-fix-root-causes** skill. Fix the accepted smell first, then delete the obsolete comment. A proven current necessity takes precedence over a `MUST KILL` verdict.
6. When a necessary comment claims an enforceable constraint, offer a type, test, assertion, lint rule, API boundary, or clearer structure that would encode it. Implement an encoding only when it fits the requested scope. Otherwise keep the comment and report the option without expanding the change.
7. Audit lint suppressions separately. Remove a suppression when the useful rule exposes code that should change. Keep a narrow suppression only when the rule is faulty, pedantic, or style-only for this site. Preserve required tool controls such as `prettier-ignore`.
8. Report what was deleted, which code changed first, what stayed and why, and any unimplemented encoding option. Do not repeat unsupported theories from the review.
