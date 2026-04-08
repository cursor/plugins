# CLI for Agents

<!-- cursor-plugin-enhancements:begin -->

## Who this is for

### For you (user level)
You learn how to spot CLIs that will frustrate agents (hidden prompts, ambiguous errors) and how to fix them before they waste a long autonomous run.

### For your projects (project level)
Tooling and platform teams ship command-line interfaces that are safe for scripts and coding agents—fewer “it works interactively but not in CI” surprises.

### Best suited for
- Developer tools, CLIs, and internal scripts consumed by automation
- Repos adding agent-run make/npx/pnpm targets
- Reviewing third-party CLIs before wiring them into agent playbooks

<!-- cursor-plugin-enhancements:end -->

Cursor plugin with a single skill that encodes patterns for **CLIs meant to be driven by coding agents**: non-interactive flags first, layered `--help` with examples, stdin and pipelines, fast actionable errors, idempotency, `--dry-run`, and predictable command structure.

## What it includes

- `cli-for-agents`: design and review guidance for agent-friendly command-line tools

## When to use it

Use when you are building or refactoring a CLI, writing subcommand help, or reviewing whether an existing tool will block agents (interactive prompts, missing examples, ambiguous errors).
