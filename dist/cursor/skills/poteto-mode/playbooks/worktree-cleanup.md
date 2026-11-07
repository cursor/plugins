---
description: "Inspect and remove only explicitly approved unused worktrees"
---

# Worktree and simulator cleanup

Read [the shared policy](../../../docs/core.md) and the current client adapter.
Cleanup is opt-in and never an automatic engineering step.

1. List actual paths with `git worktree list --porcelain`. Check each candidate's
   status, untracked/ignored artifacts, branch, and any known active session.
   A merged branch is not proof that the worktree is unused.
2. The optional POSIX audit helper is Cursor-specific and can inspect transcript
   state. Use it only with the `transcriptMining` integration enabled and an
   explicitly supplied, approved current-workspace transcript directory.
   Otherwise perform the Git-only inspection directly.
3. Show the exact candidate paths and what would be lost; obtain approval
   for the confirmed set. Preserve pinned/active work, uncommitted changes,
   untracked files, and uncertain state.
4. Use `git worktree remove <approved-path>` without force. A refusal is a
   blocker to investigate, not permission to recursively delete the directory.
   Never remove a broad/root directory or another session's state. Re-list
   worktrees and report the actual result.
5. Simulator and package-cache cleanup is a separate platform-specific request.
   Inspect exact resources and obtain approval. Do not issue delete-all or
   broad home-directory/cache removal commands.

**Reply:** approved paths removed, evidence, and the reason each retained
candidate was held.
