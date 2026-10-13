---
name: principle-validation-gate
description: "Apply any time the on-prem model configuration is written or changed. Every slug is validated against the closed allowlist and availability before it is written. A banned or unavailable slug stops the setup; it is not written and then flagged."
disable-model-invocation: true
---

# Validation Gate

Model configuration is written only after validation passes. A gate, not a warning.

**Why:** The rule file is read by every delegation that follows it. A single banned or unavailable slug in it breaks not one spawn but every role that reads that line, and it does so silently, at spawn time, far from where the bad value was written. Validating before the write is the only point where a bad value is cheap to catch.

The gate, run by `/setup-onprem` before it writes `~/.cursor/rules/onprem-models.mdc`:

1. For every role value that is a real slug (not an alias): it must be in the closed allowlist **and** available in the session. `inherit-parent` and `auto` always pass.
2. Any value that fails either check stops the write. Do not write the file with the bad value and note it. Do not substitute a banned value to "make it work."
3. If the user wanted a model that is banned or unavailable, report that specifically and offer the allowlisted alternatives only (**banned-set**).

Re-runs keep any role whose value is already on the allowlist and rewrite the whole file idempotently. The gate runs on every write, not just the first.

A hand-edited rule file can bypass the gate, which is why the `onprem-mode` **audit** playbook exists: to validate a file that the setup skill did not write.
