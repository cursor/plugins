---
name: setup-pstack
description: Verify the pstack installation under pi. Model-per-role config is inert in pi (no Task tool); this just checks the files are present.
---
# Setup pstack (pi)

**Pi environment:** there is no Task tool, no per-role subagent models, and
no `~/.cursor/rules/pstack-models.mdc`. All model-slug configuration in
pstack skills is inert here — every skill runs on the parent session model.

Nothing to configure. This skill only verifies the installation:

1. Check `~/.agents/skills/pstack/` exists and contains the skill dirs and
   `SUBAGENT-ADAPTER.md`.
2. Report the list of installed skills and remind that subagent-dependent
   steps run inline per the adapter.
