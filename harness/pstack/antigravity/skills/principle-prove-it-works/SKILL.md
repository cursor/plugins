---
name: principle-prove-it-works
description: "Explicitly invoked skill: activate ONLY when the user explicitly writes /principle-prove-it-works (or names 'principle-prove-it-works') in their message, or when another pstack skill routes to it; never auto-activate on ordinary prompts. Apply after completing a task, before declaring done. Verify against the real artifact (run the feature, read the actual value, inspect the diff), not a proxy, self-report, or 'it compiles.'"
---

# Prove It Works

Verify every output by checking the real thing directly: run the feature, read the actual value, inspect the diff. Proxies (file mtimes, self-reports, cached output, "it compiles") do not count. When a check fails, suspect the observation method before the system.

Script the check when you can. A deterministic script that reruns the comparison beats a one-time look. Keep its output where the human can see it, and commit it only when the trail must be auditable later.
