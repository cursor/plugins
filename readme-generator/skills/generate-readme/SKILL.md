---
name: generate-readme
description: Scan a repository and generate a complete, accurate README.md from its real structure, scripts, and docs
---

# Generate a README

## Trigger

The user asks to create, write, generate, or update a `README.md` for a project (e.g. "write a README", "generate a readme for this repo", "our README is outdated").

## Workflow

1. **Survey the repository** before writing anything:
   - Identify the language, framework, and package manager from manifest files (`package.json`, `pyproject.toml`, `setup.py`, `Cargo.toml`, `go.mod`, `pom.xml`, `Gemfile`, `composer.json`, `*.sln`).
   - Read the manifest for the project name, description, dependencies, and available scripts/commands.
   - List top-level files and directories to understand the layout (`src/`, `app/`, `cmd/`, `lib/`, `tests/`, `docs/`, `examples/`).
   - Check for existing docs (`README.md`, `docs/`, `CONTRIBUTING.md`, `CHANGELOG.md`), a `LICENSE`, and CI config (`.github/workflows/`) to spot test and build commands.
   - Note the license type from `LICENSE` (default to asking if ambiguous).
2. **Extract real facts only**: exact script names from the manifest, real install commands for the detected package manager, real entry points, real ports/env vars referenced in code or `.env.example`.
3. **Draft the README** with these sections (skip any that genuinely do not apply):
   - Project name and one-paragraph description of what it does and who it is for.
   - Features (bulleted, derived from the code — not aspirational).
   - Requirements (language/runtime versions from the manifest or CI config).
   - Installation (copy-pasteable commands using the detected package manager).
   - Quick start / Usage (minimal working example grounded in the actual entry point).
   - Configuration (env vars from `.env.example` or code, with placeholders, never real secrets).
   - Development (install, run, test, lint commands exactly as defined in the manifest).
   - Contributing (link to `CONTRIBUTING.md` if present, otherwise a short standard section).
   - License (from `LICENSE`).
4. **Handle an existing README**: if one exists, read it first. Preserve accurate custom content (badges, screenshots, links) and fix what is stale. Ask the user before deleting large sections of existing prose.
5. **Write the file** and summarize what was included, what was skipped, and what needs the user's input (e.g. missing description, unknown license).

## Guardrails

- Never invent features, commands, scripts, badges, or configuration that do not exist in the repository.
- Never guess version numbers — read them from manifests or CI config; if absent, omit or mark as unknown.
- Never commit real secrets; use placeholder values for env vars.
- Keep it concise: prefer short sentences and working examples over prose.
- Do not overwrite an existing README without reading it first and confirming destructive changes with the user.

## Output

- A complete `README.md` written to the repository root (or a shown draft if the user asked to review first).
- A short summary listing the sections included, sources used (manifest, LICENSE, CI), and any open questions for the user.
