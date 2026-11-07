---
name: no-comments
description: "Use for explicit comment cleanup. Preserve explanatory, legal, API, and correctness comments; aggressive cleanup requires the optional personal profile."
disable-model-invocation: true
---

# Comment cleanup

Read [the cursor adapter](../../docs/harness/cursor.md) before this skill.

Read [the core](../../docs/core.md) and the current client adapter.
This is optional, not a prerequisite to normal review.

Inspect the caller's scope and related code before proposing comment changes.
Preserve legal notices, public API contracts, external constraints, and
correctness-related suppressions. Remove stale or redundant commentary only
when the code and tests show that deletion preserves meaning.

In the opt-in personal profile, a restricted `comment-sicko` reviewer may suggest
more aggressive cleanup, but it never edits code or overrides protected comments.
The parent owns accepted changes and root-cause fixes. Do not widen scope to
reshape application code merely to remove a comment.

Return proposed/accepted deletions, rationale, preserved comments, and focused
verification. Ambiguity is a reason to retain a comment, not delete it.
