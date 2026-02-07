# Changelog

All notable changes to the GitHub plugin for Cursor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-07

### Added

- **Plugin manifest** (`.cursor/plugin.json`) — Metadata, entry points, and configuration for the GitHub plugin.
- **Rules**
  - `rules/github-actions.mdc` — Best practices for GitHub Actions workflow files: pinned action SHAs, least-privilege permissions, concurrency groups, dependency caching, matrix strategies, reusable workflows, and `pull_request_target` safety.
  - `rules/github-api.mdc` — Best practices for GitHub API usage: Octokit SDK, rate-limit handling with retry logic, pagination, GraphQL for complex queries, webhook signature validation, and structured error handling.
- **Agents**
  - `agents/github-actions-agent.md` — Specialized agent for creating CI/CD pipelines, debugging workflow failures, optimizing build times, configuring caching and matrix builds, and managing secrets and environments.
  - `agents/github-pr-reviewer.md` — Agent for reviewing pull requests with structured findings across code quality, test coverage, CI status, breaking changes, documentation, and security, using severity levels (critical, high, medium, low, praise).
- **Skills**
  - `skills/create-github-action/SKILL.md` — Step-by-step guide for creating composite and JavaScript/TypeScript GitHub Actions, including marketplace publishing, Dependabot setup, and common patterns.
  - `skills/setup-ci-pipeline/SKILL.md` — CI/CD pipeline templates for Node.js, Python, Docker, and cloud deployments, with branch protection and Dependabot configuration.
- **Hooks** (`hooks/hooks.json`)
  - Pre-commit hook to validate GitHub Actions workflow YAML syntax, check for pinned action SHAs, and verify permissions blocks.
  - Post-save hook to auto-format workflow YAML files with Prettier.
- **MCP server** (`mcp.json`) — Configuration for `@modelcontextprotocol/server-github` providing AI-accessible GitHub API operations.
- **Scripts**
  - `scripts/validate-workflows.sh` — Comprehensive workflow validation script checking YAML syntax, actionlint, pinned actions, permissions, concurrency, timeouts, `pull_request_target` safety, and hard-coded secrets.
- **Documentation**
  - `README.md` — Plugin overview, setup guide, usage instructions, and project structure.
  - `CHANGELOG.md` — This changelog.
  - `LICENSE` — MIT License.

[1.0.0]: https://github.com/cursor/service-plugin-generation/releases/tag/github-plugin-v1.0.0
