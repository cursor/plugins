# Agentic Code Review: feat/pstack-omp-harness

* **Date:** 2026-10-30 13:05:30 UTC
* **Model:** openai-codex/gpt-6-sol
* **PAAD version:** 2.0.2
* **Branch:** feat/pstack-omp-harness -> main
* **Commit:** 9563e20d9e5a8c71bf2a965a54da2862e2a5365f
* **Files changed:** 565 | **Lines changed:** +30920 / -33
* **Diff size category:** Large

## Executive Summary

Four Important findings survived verification: three integration or diagnostic defects described below and one security-related finding in the separate security report. The generator's escaping-link failure was reproduced in a temporary fixture; the other findings were confirmed against their callers and current files.

## Critical Issues

None found.

## Important Issues

### [I1] Dangling-link validation exits without diagnostics
- **File:** `scripts/generate-pstack-harness-trees.mjs:192`
- **Bug:** The branch removed the loop printing each `dangling` link but still exits immediately when the list is nonempty. An existing relative target outside the generated tree fails generation or `--check` with no message.
- **Impact:** A source-link regression blocks CI and generation without identifying the document or link to fix. A temporary fixture with an escaping link returned exit 1 and empty stdout/stderr.
- **Suggested fix:** Print the collected link errors before exiting, as the previous generator did.
- **Confidence:** High (99/100)
- **Found by:** Error Handling & Edge Cases (`openai-codex/gpt-6.1-sol`)
- **Bug class:** Error Handling

### [I2] OMP worktree audit mistakes unavailable chat history for inactivity
- **File:** `harness/pstack/omp/skills/poteto-mode/scripts/worktree-audit.sh:72-74`
- **Bug:** The generated OMP audit searches only Cursor's `~/.cursor/projects/<slug>/agent-transcripts`. If that directory is absent, the subsequent lookup retains `last_ts=0`, sets `recent=no`, and can label a merged worktree `safe` despite recent OMP activity.
- **Impact:** The cleanup workflow's automated activity classification skips its `verify-recent-chat` bucket. A separate manual activity check in the playbook reduces, but does not repair, this incorrect audit result.
- **Suggested fix:** Supply OMP activity evidence to the helper, or classify unavailable history as unknown and require a usage check before labeling the worktree safe.
- **Confidence:** High (97/100)
- **Found by:** Error Handling & Edge Cases, Contract & Integration (`openai-codex/gpt-6.1-sol`)
- **Bug class:** Error Handling

### [I3] Reflection reviewers overlook OMP skill usage
- **File:** `harness/pstack/omp/skills/reflect/references/judgment-reviewer.md:20`
- **Bug:** The usage filter recognizes Cursor `Read` operations and `.cursor` paths, not OMP `read` calls on `skill://<name>`. The tooling and divergent templates repeat that filter, and the synthesizer consumes their routed findings.
- **Impact:** An OMP session that loads a skill through the documented adapter can have legitimate body-improvement findings discarded or misrouted as missed triggers.
- **Suggested fix:** Teach all three templates to recognize OMP skill reads, `skill://` identifiers, and configured skill-directory paths.
- **Confidence:** High (86/100)
- **Found by:** Contract & Integration (`openai-codex/gpt-6.1-sol`)
- **Bug class:** Contract

1 security finding(s) written to paad/security/code-review-feat-pstack-omp-harness-2026-10-30-13-05-30-9563e20.md

## Suggestions

None found.

## Review Metadata

- **Agents dispatched:** all six lenses in each of two partitions: Logic & Correctness A/B findings (0/0); Error Handling & Edge Cases A/B findings (2/0); Contract & Integration A/B findings (2/0); Concurrency & State A/B findings (0/0); Security A/B findings (1/0); Spec Compliance A/B findings (0/0).
- **Scope:** 565 changed files across generator, CI, documentation and generated OMP tree; adjacent source and integration counterparts: `scripts/check-pstack-docs.mjs`, `scripts/validate-plugins.mjs`, `pstack/plugin.json`, `pstack/docs/harness/claude-code.md`, `pstack/skills/poteto-mode/SKILL.md`, `pstack/skills/setup-pstack/SKILL.md`, and `pstack/skills/statechart/` source files. Partition A: 158 non-statechart changed paths; partition B: 407 generated statechart changed paths.
- **Raw findings:** 5
- **Verified findings:** 4
- **Filtered out:** 1 (duplicate audit finding merged)
- **Out-of-scope findings:** 0 (Critical: 0, Important: 0, Suggestion: 0)
- **Out-of-scope additions:** 0
- **Backlog:** 0 new entries added, 0 re-confirmed (see `paad/code-reviews/backlog.md`)
- **Security:** 1 finding(s) written to `paad/security/code-review-feat-pstack-omp-harness-2026-10-30-13-05-30-9563e20.md`; security backlog: 0 new, 0 re-confirmed on this machine
- **Steering files consulted:** none found
- **Intent sources consulted:** branch name, recent commit message, `pstack/docs/harness/omp.md`, `pstack/README.md`
- **Verifier warnings:** none
