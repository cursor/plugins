# Benny for Codex and Claude Code

Benny preserves two upstream workflows: classify a Slack report with one thread-only verdict; then wait for trusted classification, verify an existing fix or reproduce twice before a bounded draft fix.

1. Run `../benny-tools/merge-pack.mjs <project> <actual-source-commit>` with Node. It copies the full pack to `.pstack/benny`, preserves destination-only files and refuses conflicts before writing. A successful readback records source commit and SHA-256 hashes in `.pstack/benny-install.json`. Re-run after skills updates.
2. Read the copied FOR_AGENTS.md and setup instruction. Keep user configuration, routing and feature maps outside the pack, for example `.pstack/benny-user/`. Secrets stay in host credentials or environment.
3. Install and verify project-scoped dependencies in a fresh session. Commit the pack and secret-free configuration.
4. Follow [DEPLOYMENT.md](./DEPLOYMENT.md). Installation never enables a schedule or writes external services.

Pack conflicts require reviewing and merging the source/local diff. The merge tool cannot infer whether user edits may be discarded and makes no changes on conflict. After resolving and reviewing the target file to match the desired source, rerun to refresh the record.

The three nested files are instruction.md, preserving upstream business instructions and resources without registering them as normal skills. Real Slack trigger, tracker writes and desktop reproduction remain unverified until an authorized test target is supplied.
