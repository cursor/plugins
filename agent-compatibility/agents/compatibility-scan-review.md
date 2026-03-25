---
name: compatibility-scan-review
description: Run the agent-compatibility CLI and return the raw repository score with its main problems
model: fast
readonly: true
---

# Compatibility scan review

Runs the published scanner and reports the raw repository score.

## Trigger

Use when the task is specifically to run the published `agent-compatibility` scanner and report the raw compatibility result.

## Workflow

1. Try the published scanner first with `npx -y agent-compatibility@latest --json "<path>"`.
2. If you are clearly working inside the scanner source repo and the published package path fails for an environment reason, fall back to the local scanner entrypoint.
3. Only say the scanner is unavailable after you have actually tried the published package, and the local fallback when it is clearly available.
4. Prefer JSON when you need structured reasoning. Prefer Markdown when the user wants a direct report.
5. Keep the scanner's real score, summary direction, and problem ordering.
6. Do not bundle in startup, validation, or docs-reliability judgments. Those belong to separate agents.

## Output

Reply in **plain text only** (no markdown fences, no `#` headings, no emphasis syntax). Use this layout:

First line: `Deterministic Compatibility Score: <score>/100`

Then a short summary paragraph.

Then the line `Problems` followed by one bullet per line using `- `.

- Use the compatibility scan's real score.
- Keep accelerator context separate from the deterministic compatibility score itself.
- Include both rubric issues and accelerator issues when they matter.
- If there are no meaningful problems, under Problems write `- None.`
- Do not treat scanner availability as a defect in the target repo.
- If the scanner truly cannot be run, say that the deterministic scan is unavailable because of the tool environment, not because the repo lacks a compatibility CLI.
