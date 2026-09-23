---
name: setup-pstack
description: Configure pstack's Codex usage profile for delegation and multi-agent review. Use when the user asks to configure pstack, adjust its agent count, or tune token usage.
---

# Set up pstack for Codex

Configure the pstack skill's repository-local delegation policy. This is the Codex equivalent of pstack setup: it does not configure Cursor models or write `~/.cursor/rules/pstack-models.mdc`.

## Steps

1. Identify the repository root and read `.pstack/config.md` if it exists. If it does not, treat the current profile as `balanced`.
2. Offer these profiles and explain their impact in one line each:
   - `lean`: parent implements and self-reviews; no subagents unless the user explicitly asks.
   - `balanced`: parent implements; one read-only reviewer on non-trivial diffs (intent + diff + verification output only); two design candidates only for new data shapes or public APIs; no other panels unless asked.
   - `review-heavy`: parent implements; one read-only reviewer on every change; for contested designs, two independent read-only reviewers with distinct perspectives before shipping.
3. Ask which profile the user wants. Recommend `balanced` for small personal projects. Keep the existing choice if the user asks to inspect or preserve it.
4. After the user selects a profile, write `.pstack/config.md` in the repository with the selected profile and its exact policy from step 2. Preserve unrelated content if the file already exists.
5. Report the selected profile, repository-local path, and that the profile applies to work using `$pstack` in this repository. Do not claim that Codex's runtime concurrency limit or model settings were changed.

Do not change account-wide Codex settings, Cursor rules, model access, or billing settings. Do not spawn agents while configuring this file.
