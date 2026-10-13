# Audit

Validate the on-prem rule file as the lock surface. Use when the rule may have drifted, been hand-edited, or been inherited from another setup.

1. Read `~/.cursor/rules/onprem-models.mdc`. Absent → run the `/setup-onprem` skill; there is nothing to audit.
2. Check the allowlist line names exactly the closed set: `inherit-parent`/`auto`, `Qwen/Qwen3.8-27B-FP8`, `Qwen/Qwen3.8-Flash-Next-FP8`, `moonshotai/Kimi-K3`, `zai-org/GLM-5.3`.
3. List every role line and its value.
4. For each value: it must be an alias or on the allowlist. A banned or unknown slug is a violation. A value can be allowlisted and still wrong for the role's tier. Flag a single-model judgment or prose role that points at a panel or code model, and a code role that points at a panel model, as a tiering mismatch.
5. Report each violation and each tiering mismatch with the line and the value, and offer the `/setup-onprem` fix. A rule with no violations and no tiering mismatches is the deliverable; say so and name the allowlist.
